'use client';

import React, { useState } from 'react';

const ContactForm = () => {
    const [status, setStatus] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus('sending');
        // Simulate form submission
        setTimeout(() => {
            setStatus('sent');
            e.target.reset();
            setTimeout(() => setStatus(''), 3000);
        }, 1000);
    };

    return (
        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 max-w-4xl mx-auto w-full">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900">Send us a Message</h2>
                <p className="mt-3 text-slate-500">Fill out the form below and our team will get back to you shortly.</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">First Name</label>
                        <input 
                            type="text" 
                            required
                            placeholder="Enter first name" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-slate-50 focus:bg-white" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Last Name</label>
                        <input 
                            type="text" 
                            required
                            placeholder="Enter last name" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-slate-50 focus:bg-white" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Email</label>
                        <input 
                            type="email" 
                            required
                            placeholder="Enter email address" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-slate-50 focus:bg-white" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Phone</label>
                        <input 
                            type="tel" 
                            placeholder="Enter phone number" 
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all bg-slate-50 focus:bg-white" 
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Comments / Questions</label>
                    <textarea 
                        required
                        placeholder="Enter your comments / questions" 
                        rows="5" 
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all resize-none bg-slate-50 focus:bg-white"
                    ></textarea>
                </div>
                
                <button 
                    disabled={status === 'sending' || status === 'sent'}
                    className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-70 flex justify-center items-center gap-2 uppercase tracking-widest text-sm"
                >
                    {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Message Sent ✓' : 'Submit Message'}
                </button>
            </form>
        </div>
    );
};

export default ContactForm;
