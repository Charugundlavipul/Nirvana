'use client';

import emailjs from "@emailjs/browser";
import { useState } from "react";

const emailJsConfig = {
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "",
  contactTemplateId: process.env.NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE_ID ?? "",
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "",
};

const initialStatus = {
  message: "",
  tone: "idle",
};

function getRequiredConfigKeys() {
  return [
    ["NEXT_PUBLIC_EMAILJS_SERVICE_ID", emailJsConfig.serviceId],
    ["NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE_ID", emailJsConfig.contactTemplateId],
    ["NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", emailJsConfig.publicKey],
  ];
}

function readField(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(initialStatus);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const missingConfig = getRequiredConfigKeys()
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingConfig.length > 0) {
      setStatus({
        message: `Email sending is not configured yet. Missing: ${missingConfig.join(", ")}`,
        tone: "error",
      });
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const userName = readField(formData, "name");
    const userEmail = readField(formData, "email");
    const userPhone = readField(formData, "phone") || "Not provided";
    const inquiryMessage = readField(formData, "message");

    if (!userName || !userEmail || !inquiryMessage) {
      setStatus({
        message: "Please complete the required fields before submitting the form.",
        tone: "error",
      });
      return;
    }

    const submittedAt = new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());

    const templateParams = {
      user_name: userName,
      user_email: userEmail,
      user_phone: userPhone,
      inquiry_message: inquiryMessage,
      submitted_at: submittedAt,
      reply_to: userEmail,
    };

    setIsSubmitting(true);
    setStatus(initialStatus);

    try {
      await emailjs.send(
        emailJsConfig.serviceId,
        emailJsConfig.contactTemplateId,
        {
          ...templateParams,
          email_subject: `New website inquiry from ${userName}`,
        },
        {
          publicKey: emailJsConfig.publicKey,
        }
      );

      form.reset();
      setStatus({
        message: `Thanks, ${userName}. Your inquiry has been sent.`,
        tone: "success",
      });
    } catch (error) {
      console.error("EmailJS contact form send failed", error);
      setStatus({
        message:
          "We could not send your inquiry right now. Please try again in a moment.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusToneError = status.tone === "error";

  return (
    <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 max-w-4xl mx-auto w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900">Send us a Message</h2>
        <p className="mt-3 text-slate-500">Fill out the form below and our team will get back to you shortly.</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Full Name</label>
            <input 
              name="name"
              type="text" 
              required
              placeholder="Enter full name" 
              className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-slate-50 focus:bg-white" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Phone</label>
            <input 
              name="phone"
              type="tel" 
              placeholder="Enter phone number" 
              className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-slate-50 focus:bg-white" 
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-bold text-slate-700">Email</label>
            <input 
              name="email"
              type="email" 
              required
              placeholder="Enter email address" 
              className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-slate-50 focus:bg-white" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">Comments / Questions</label>
          <textarea 
            name="message"
            required
            placeholder="Enter your comments / questions" 
            rows="5" 
            className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all resize-none bg-slate-50 focus:bg-white"
          ></textarea>
        </div>

        {status.message && (
          <div
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 text-sm leading-[1.7] ${
              statusToneError 
                ? "border-red-200 bg-red-50 text-red-800" 
                : "border-green-200 bg-green-50 text-green-800"
            }`}
            role={statusToneError ? "alert" : "status"}
          >
            {status.message}
          </div>
        )}

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-70 flex justify-center items-center gap-2 uppercase tracking-widest text-sm"
        >
          {isSubmitting ? 'Sending...' : 'Submit Message'}
        </button>
      </form>
    </div>
  );
}
