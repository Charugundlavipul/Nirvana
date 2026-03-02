import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import RichTextContent from "../common/RichTextContent";

const LegalPage = ({ pageKey }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [effectiveDate, setEffectiveDate] = useState(null);
    const [loading, setLoading] = useState(true);

    const fallbackTitle = pageKey === "terms_and_conditions"
        ? "Terms and Conditions"
        : pageKey === "privacy_policy"
            ? "Privacy Policy"
            : "Legal";

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("site_content")
                    .select("*")
                    .eq("key", pageKey)
                    .single();

                if (error && error.code !== "PGRST116") throw error;

                if (data) {
                    setTitle(data.title || fallbackTitle);
                    setContent(data.content || "");
                    setLastUpdated(data.last_updated || null);
                    setEffectiveDate(data.effective_date || null);
                } else {
                    setTitle(fallbackTitle);
                    setContent("");
                }
            } catch (err) {
                console.error("Error loading legal page:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [pageKey]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
            {/* Hero */}
            <div className="relative h-[35vh] w-full overflow-hidden bg-gradient-to-br from-[#0b1324] via-[#0f1b33] to-[#10243f] -mt-[50px] flex items-center justify-center">
                <div className="text-center px-6 pt-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-4">Legal</p>
                    <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
                        {loading ? "Loading..." : title}
                    </h1>
                    {!loading && (effectiveDate || lastUpdated) && (
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

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-16">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-5" style={{ width: `${90 - i * 10}%` }} />
                        ))}
                    </div>
                ) : content ? (
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
