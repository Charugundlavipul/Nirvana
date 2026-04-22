'use client';

import React from "react";
import RichTextContent from "../common/RichTextContent";

const LegalPage = ({ pageKey, initialData }) => {
    const fallbackTitle = pageKey === "terms_and_conditions"
        ? "Terms and Conditions"
        : pageKey === "privacy_policy"
            ? "Privacy Policy"
            : "Legal";

    const title = initialData?.title || fallbackTitle;
    const content = initialData?.content || "";
    const lastUpdated = initialData?.lastUpdated || null;
    const effectiveDate = initialData?.effectiveDate || null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
            <div className="site-hero site-hero--sm flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1324] via-[#0f1b33] to-[#10243f]">
                <div className="text-center px-6 pt-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-4">Legal</p>
                    <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
                        {title}
                    </h1>
                    {(effectiveDate || lastUpdated) && (
                        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
                            {effectiveDate && (
                                <span>Effective Date: {new Date(effectiveDate + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                            )}
                            {lastUpdated && (
                                <span>Last Updated: {new Date(lastUpdated + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-16">
                {content ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12">
                        <RichTextContent
                            value={content}
                            className="prose prose-gray max-w-none text-base leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-5 [&_h4]:mb-2 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-1 [&_a]:text-accent [&_a]:underline [&_strong]:font-bold [&_em]:italic"
                        />
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-lg">This page has not been published yet.</p>
                        <p className="text-gray-400 text-sm mt-2">Please check back later.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LegalPage;
