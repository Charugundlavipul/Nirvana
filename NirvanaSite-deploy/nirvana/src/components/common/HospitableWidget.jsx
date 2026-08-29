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
                iframe.setAttribute('scrolling', 'no');
                iframe.style.overflow = 'hidden';
            }
        };

        const handleMessage = (event) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const height = data?.height || data?.payload?.height || (data?.event === 'resize' ? data?.value : null);
                if (height && typeof height === 'number' && height > 400) {
                    const iframe = document.getElementById('booking-iframe');
                    if (iframe && container.contains(iframe)) {
                        iframe.style.height = `${height + 40}px`;
                        container.style.minHeight = `${height + 40}px`;
                    }
                }
            } catch (e) {
                // Ignore non-JSON messages from other window extensions
            }
        };

        window.addEventListener('hospitable:widget-loader:ready', handleReady);
        window.addEventListener('message', handleMessage);

        const script = document.createElement('script');
        script.src = config.src;
        script.async = true;
        script.dataset.siteUuid = config.siteUuid;
        script.dataset.propertyId = config.propertyId;
        script.dataset.container = containerId;
        if (config.theme) script.dataset.theme = config.theme;
        script.dataset.height = config.height || '900px';
        script.addEventListener('error', () => {
            setLoadError('Hospitable checkout could not be loaded. Please try again shortly.');
        });

        container.appendChild(script);

        return () => {
            window.removeEventListener('hospitable:widget-loader:ready', handleReady);
            window.removeEventListener('message', handleMessage);
            script.remove();

            const iframe = document.getElementById('booking-iframe');
            if (iframe && container.contains(iframe)) {
                iframe.remove();
            }
        };
    }, [containerId, parsedWidget.config]);

    if (!parsedWidget.config) return null;

    return (
        <div className="w-full max-w-xl mx-auto my-6 px-4 sm:px-0 flex justify-center">
            <div
                id={containerId}
                ref={containerRef}
                className="w-full max-w-[480px] min-h-[850px] rounded-3xl bg-white shadow-2xl shadow-slate-300/50 border border-slate-200 p-4 sm:p-6 transition-all duration-300 hospitable-widget-container mx-auto"
                data-hospitable-widget-container="true"
            >
                {loadError && (
                    <div className="p-4 text-center text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl">
                        {loadError}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitableWidget;
