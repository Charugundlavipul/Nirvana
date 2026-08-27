'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { parseHospitableWidgetCode } from '../../lib/hospitableWidget';

const HospitableWidget = ({ widgetCode, propertyName }) => {
    const reactId = useId();
    const containerId = useMemo(
        () => `hospitable-widget-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
        [reactId]
    );
    const containerRef = useRef(null);
    const [loadError, setLoadError] = useState('');
    const parsedWidget = useMemo(() => parseHospitableWidgetCode(widgetCode), [widgetCode]);

    useEffect(() => {
        const config = parsedWidget.config;
        const container = containerRef.current;
        if (!config || !container) return undefined;

        const existingIframe = document.getElementById('booking-iframe');
        if (existingIframe && !container.contains(existingIframe)) {
            setLoadError('Another Hospitable booking widget is already active on this page.');
            return undefined;
        }

        setLoadError('');

        const handleReady = () => {
            const iframe = document.getElementById('booking-iframe');
            if (iframe && container.contains(iframe)) {
                iframe.dataset.nirvanaHospitableWidget = containerId;
            }
        };

        window.addEventListener('hospitable:widget-loader:ready', handleReady);

        const script = document.createElement('script');
        script.src = config.src;
        script.async = true;
        script.dataset.siteUuid = config.siteUuid;
        script.dataset.propertyId = config.propertyId;
        script.dataset.container = containerId;
        if (config.theme) script.dataset.theme = config.theme;
        if (config.height) script.dataset.height = config.height;
        script.addEventListener('error', () => {
            setLoadError('Hospitable checkout could not be loaded. Please try again shortly.');
        });

        container.appendChild(script);

        return () => {
            window.removeEventListener('hospitable:widget-loader:ready', handleReady);
            script.remove();

            const iframe = document.getElementById('booking-iframe');
            if (iframe && container.contains(iframe)) {
                iframe.remove();
            }
        };
    }, [containerId, parsedWidget.config]);

    if (!parsedWidget.config) return null;

    return (
        <section className="border-t border-slate-200 bg-slate-50 py-16" aria-label="Hospitable secure checkout">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mb-8 text-center">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                        Secure Direct Booking
                    </p>
                    <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
                        Complete your stay{propertyName ? ` at ${propertyName}` : ''}
                    </h2>
                    <p className="mt-3 text-sm text-slate-500">
                        Availability, checkout, and payment are securely handled by Hospitable.
                    </p>
                </div>

                {loadError && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-700">
                        {loadError}
                    </div>
                )}

                <div
                    id={containerId}
                    ref={containerRef}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
                    data-hospitable-widget-container="true"
                />
            </div>
        </section>
    );
};

export default HospitableWidget;
