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
        <div
            id={containerId}
            ref={containerRef}
            aria-hidden="true"
            style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
                opacity: 0,
                pointerEvents: 'none',
            }}
            data-hospitable-widget-container="true"
        />
    );
};

export default HospitableWidget;
