# Two-Way Google Chat Support Integration

To build a chatbot where customers chat on your website and your team responds directly inside a Google Chat space, you need a two-way synchronization system. 

Since Google Chat does not natively offer a drop-in website widget, you'll need to build the bridge connecting a custom React widget on your website to the Google Chat API.

---

## 🏗️ Architecture Overview

1. **Database (Supabase)**: Stores the active chat sessions, messages, and maps them to specific Google Chat "Threads".
2. **Frontend Widget (Next.js)**: A persistent chat window on the website that listens to the database for new replies via Supabase Realtime.
3. **Backend API (Next.js Edge/Node)**: API routes that handle securely formatting and pushing messages to the Google Chat API.
4. **Google Cloud App (Google Chat API)**: A registered Google Chat Bot that listens for team replies in your Space and pushes them back to your Next.js API.

---

## 🛠️ Step-by-Step Implementation

### Step 1: Database Setup (Supabase)
Create two tables to track ongoing conversations securely so that users don't lose their chat when they refresh the page.

```sql
-- Tracks a single user's conversation session
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gchat_thread_name TEXT, -- The ID of the thread in Google Chat
    customer_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks the actual messages sent back and forth
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender TEXT CHECK (sender IN ('customer', 'team')),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Supabase Realtime on chat_messages so the widget updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
```

### Step 2: Google Cloud Console Setup
To talk to Google Chat bi-directionally, standard Webhooks aren't enough (they are one-way only). You must create a **Google Chat App**.

1. Go to the **Google Cloud Console** and enable the **Google Chat API**.
2. Go to the **Configuration** tab of the Google Chat API.
3. App Status: **LIVE**
4. Set the **Connection Settings** to **HTTP Endpoint URL**.
   - Input your production webhook URL: `https://YOUR_DOMAIN.com/api/webhooks/gchat`
5. Grant the app permission to join Spaces, and add the App to your team's Support Space.

### Step 3: Handling Incoming Webhooks (GChat -> Website)
Create an API route in Next.js (`app/api/webhooks/gchat/route.js`) that Google will hit whenever your team replies to a thread.

```javascript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

export async function POST(req) {
    const body = await req.json();

    // 1. Google requires you to respond to a sync challenge when setting up
    if (body.type === 'ADDED_TO_SPACE') return NextResponse.json({ text: 'Support Bot Online!' });

    // 2. Handle a message event
    if (body.type === 'MESSAGE') {
        const threadName = body.message.thread.name;
        const text = body.message.argumentText || body.message.text;

        // Lookup the database session associated with this reply
        const { data: session } = await supabaseAdmin
            .from('chat_sessions')
            .select('id')
            .eq('gchat_thread_name', threadName)
            .single();

        if (session) {
            // Save the team's reply back to Supabase
            await supabaseAdmin.from('chat_messages').insert({
                session_id: session.id,
                sender: 'team',
                content: text
            });
        }
        
        // Return a confirmation to Google Chat (optional)
        return NextResponse.json({});
    }

    return NextResponse.json({ error: 'Unhandled event' }, { status: 400 });
}
```

### Step 4: Pushing Messages (Website -> GChat)
When a customer sends a message from the widget, call a Next.js API route (`/api/chat/send`) that does two things:
1. Inserts the message into `chat_messages`.
2. Uses the [Google APIs Node.js Client](https://github.com/googleapis/google-api-nodejs-client) authenticating via a Service Account to push a message into your designated Support Space.
3. If it's the *first* message, it creates a new Thread. Update the database `chat_sessions` with this new thread ID. If it's a continuing conversation, it pushes the message to the *existing* thread ID.

### Step 5: The Frontend React Widget
Create a floating chat widget that sits at the bottom right of the screen.

- **On Mount**: Check `localStorage` for an existing `chat_session_id`. If none exists, generate one and save it.
- **Subscription**: Use `supabase.channel('my_chat').on('postgres_changes', ...)` listening precisely to `chat_messages` where `session_id` equals the local ID.
- **UI**: Display `sender === 'customer'` on the right (in brand green) and `sender === 'team'` on the left (in gray). 

---

## 💡 Pro-Tip Alternative (No Code / Low Code)
Building this entirely from scratch provides total control, but managing Google Service Account OAuth scopes specifically for the Google Chat API can be a headache. 

As a much faster alternative, you could use a tool like **Chatwoot**, **Tidio**, or **Crisp**, which offer pre-built website widgets, and then use **Make.com** or **Zapier** to directly bridge those platforms' Webhooks natively into Google Chat. 

Would you like to build this fully custom in your Next.js/Supabase codebase, or would you prefer I outline the faster Zapier/Make integrations approach?
