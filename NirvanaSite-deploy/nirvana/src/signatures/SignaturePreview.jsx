"use client";

import React, { useState } from 'react';
import './SignaturePreview.css';

const genericHTML = `
            <table cellpadding="0" cellspacing="0" border="0" width="600px"
                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                <tbody>
                    <tr>
                        <td colspan="6" style="padding-bottom: 20px; text-align: left;">
                            <p
                                style="margin: 0px; font-size: 14px; font-family: Arial, sans-serif; color: rgb(0, 0, 0);">
                                Thanks,
                            </p>
                            <p
                                style="margin: 5px 0px 0px; font-size: 20px; font-family: 'Brush Script MT', cursive; color: rgb(0, 0, 0);">
                                [Your Name]</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <table cellpadding="0" cellspacing="0" border="0"
                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                                <tbody>
                                    <tr>
                                        <td width="100" style="vertical-align: middle;"><span
                                                style="margin-right: 20px; display: block;"><img
                                                    src="https://www.dropbox.com/scl/fi/o9qg9id0hwj3gc2nsjdm1/vkr-ventures.jpeg?rlkey=ew496ub9lrrnj7zm4l1vemqxi&amp;st=nhlayhe6&amp;dl=0&amp;raw=1"
                                                    role="presentation" width="80" style="max-width: 80px;" /></span></td>
                                        <td style="vertical-align: middle;">
                                            <h2
                                                style="margin: 0px; font-size: 18px; font-family: Arial; color: rgb(0, 0, 0); font-weight: 600; line-height: 28px;">
                                                <span>[First Name]</span><span>&nbsp;</span><span>[Last Name]</span>
                                            </h2>
                                            <div
                                                style="margin: 0px; font-weight: 500; color: rgb(0, 0, 0); font-size: 14px; line-height: 22px;">
                                                <span>VKR Ventures LLC</span>
                                            </div>
                                        </td>
                                        <td width="30" aria-label="Vertical Spacer">
                                            <div style="width: 30px;"></div>
                                        </td>
                                        <td width="1" aria-label="Divider"
                                            style="width: 1px; height: auto; border-bottom: none; border-left: 1px solid rgb(247, 201, 99);">
                                        </td>
                                        <td width="30" aria-label="Vertical Spacer">
                                            <div style="width: 30px;"></div>
                                        </td>
                                        <td style="vertical-align: middle;">
                                            <table cellpadding="0" cellspacing="0" border="0"
                                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; line-height: 1;">
                                                <tbody>
                                                    <tr style="vertical-align: middle; height: 28px;">
                                                        <td width="26" style="vertical-align: middle;">
                                                            <table cellpadding="0" cellspacing="0" border="0"
                                                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; width: 26px;">
                                                                <tbody>
                                                                    <tr>
                                                                        <td style="vertical-align: bottom;"><span
                                                                                style="display: inline-block; background-color: rgb(247, 201, 99);"><img
                                                                                    src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/phone-icon-dark-2x.png"
                                                                                    alt="mobilePhone" width="18"
                                                                                    style="display: block; background-image: linear-gradient(rgb(247, 201, 99), rgb(247, 201, 99));" /></span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td style="padding: 0px; color: rgb(0, 0, 0);"><a
                                                                href="tel:[Your Phone]"
                                                                style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;"><span>[Your
                                                                    Phone]</span></a></td>
                                                    </tr>
                                                    <tr style="vertical-align: middle; height: 28px;">
                                                        <td width="26" style="vertical-align: middle;">
                                                            <table cellpadding="0" cellspacing="0" border="0"
                                                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; width: 26px;">
                                                                <tbody>
                                                                    <tr>
                                                                        <td style="vertical-align: bottom;"><span
                                                                                style="display: inline-block; background-color: rgb(247, 201, 99);"><img
                                                                                    src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/email-icon-dark-2x.png"
                                                                                    alt="emailAddress" width="18"
                                                                                    style="display: block; background-image: linear-gradient(rgb(247, 201, 99), rgb(247, 201, 99));" /></span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td style="padding: 0px; color: rgb(0, 0, 0);"><a
                                                                href="mailto:[name]@vkr-ventures.com"
                                                                style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;"><span>[name]@vkr-ventures.com</span></a>
                                                        </td>
                                                    </tr>
                                                    <tr style="vertical-align: middle; height: 28px;">
                                                        <td width="26" style="vertical-align: middle;">
                                                            <table cellpadding="0" cellspacing="0" border="0"
                                                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; width: 26px;">
                                                                <tbody>
                                                                    <tr>
                                                                        <td style="vertical-align: bottom;"><span
                                                                                style="display: inline-block; background-color: rgb(247, 201, 99);"><img
                                                                                    src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/link-icon-dark-2x.png"
                                                                                    alt="website" width="18"
                                                                                    style="display: block; background-image: linear-gradient(rgb(247, 201, 99), rgb(247, 201, 99));" /></span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td style="padding: 0px; color: rgb(0, 0, 0);"><a
                                                                href="//www.vkr-ventures.com"
                                                                style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;"><span>www.vkr-ventures.com</span></a>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="6" style="font-size: 12px; padding-top: 1rem; text-align: left;">
                            <div class="legal-content">
                                <p style="font-size: inherit; margin: 0px;">IMPORTANT: The contents of this email and
                                    any
                                    attachments are confidential. They are intended for the named recipient(s) only. If
                                    you have
                                    received this email by mistake, please notify the sender immediately and do not
                                    disclose the
                                    contents to anyone or make copies thereof.</p>
                                <br/>
                                <p style="font-size: inherit; margin: 0px;">​ATTN: By law all Real Estate Agents/Brokers
                                    are
                                    required to provide each consumer with the Working With Real Estate Agents Brochure.
                                    Please
                                    click on the link below to view the publication.</p>
                                <p style="font-size: inherit; margin: 0px;"><a
                                        href="http://www.ncrec.gov/Brochures/Work"
                                        style="color: #60BD68; text-decoration: underline;">http://www.ncrec.gov/Brochures/Work</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
`;

const supportHTML = `
            <table cellpadding="0" cellspacing="0" border="0" width="600px"
                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                <tbody>
                    <tr>
                        <td colspan="6" style="padding-bottom: 20px; text-align: left;">
                            <p
                                style="margin: 0px; font-size: 14px; font-family: Arial, sans-serif; color: rgb(0, 0, 0);">
                                Thanks,
                            </p>
                            <p
                                style="margin: 5px 0px 0px; font-size: 20px; font-family: 'Brush Script MT', cursive; color: rgb(0, 0, 0);">
                                Support Team</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <table cellpadding="0" cellspacing="0" border="0"
                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial;">
                                <tbody>
                                    <tr>
                                        <td width="100" style="vertical-align: middle;"><span
                                                style="margin-right: 20px; display: block;"><img
                                                    src="https://www.dropbox.com/scl/fi/o9qg9id0hwj3gc2nsjdm1/vkr-ventures.jpeg?rlkey=ew496ub9lrrnj7zm4l1vemqxi&amp;st=nhlayhe6&amp;dl=0&amp;raw=1"
                                                    role="presentation" width="80" style="max-width: 80px;" /></span></td>
                                        <td style="vertical-align: middle;">
                                            <h2
                                                style="margin: 0px; font-size: 18px; font-family: Arial; color: rgb(0, 0, 0); font-weight: 600; line-height: 28px;">
                                                <span>Support</span><span>&nbsp;</span><span>Team</span>
                                            </h2>
                                            <div
                                                style="margin: 0px; font-weight: 500; color: rgb(0, 0, 0); font-size: 14px; line-height: 22px;">
                                                <span>Customer Support</span><span>&nbsp;| </span><span>VKR Ventures
                                                    LLC</span>
                                            </div>
                                        </td>
                                        <td width="30" aria-label="Vertical Spacer">
                                            <div style="width: 30px;"></div>
                                        </td>
                                        <td width="1" aria-label="Divider"
                                            style="width: 1px; height: auto; border-bottom: none; border-left: 1px solid rgb(247, 201, 99);">
                                        </td>
                                        <td width="30" aria-label="Vertical Spacer">
                                            <div style="width: 30px;"></div>
                                        </td>
                                        <td style="vertical-align: middle;">
                                            <table cellpadding="0" cellspacing="0" border="0"
                                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; line-height: 1;">
                                                <tbody>
                                                    <tr style="vertical-align: middle; height: 28px;">
                                                        <td width="26" style="vertical-align: middle;">
                                                            <table cellpadding="0" cellspacing="0" border="0"
                                                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; width: 26px;">
                                                                <tbody>
                                                                    <tr>
                                                                        <td style="vertical-align: bottom;"><span
                                                                                style="display: inline-block; background-color: rgb(247, 201, 99);"><img
                                                                                    src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/phone-icon-dark-2x.png"
                                                                                    alt="mobilePhone" width="18"
                                                                                    style="display: block; background-image: linear-gradient(rgb(247, 201, 99), rgb(247, 201, 99));" /></span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td style="padding: 0px; color: rgb(0, 0, 0);"><a
                                                                href="tel:7047801369"
                                                                style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;"><span>7047801369</span></a>
                                                        </td>
                                                    </tr>
                                                    <tr style="vertical-align: middle; height: 28px;">
                                                        <td width="26" style="vertical-align: middle;">
                                                            <table cellpadding="0" cellspacing="0" border="0"
                                                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; width: 26px;">
                                                                <tbody>
                                                                    <tr>
                                                                        <td style="vertical-align: bottom;"><span
                                                                                style="display: inline-block; background-color: rgb(247, 201, 99);"><img
                                                                                    src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/email-icon-dark-2x.png"
                                                                                    alt="emailAddress" width="18"
                                                                                    style="display: block; background-image: linear-gradient(rgb(247, 201, 99), rgb(247, 201, 99));" /></span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td style="padding: 0px; color: rgb(0, 0, 0);"><a
                                                                href="mailto:support@vkr-ventures.com"
                                                                style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;"><span>support@vkr-ventures.com</span></a>
                                                        </td>
                                                    </tr>
                                                    <tr style="vertical-align: middle; height: 28px;">
                                                        <td width="26" style="vertical-align: middle;">
                                                            <table cellpadding="0" cellspacing="0" border="0"
                                                                style="vertical-align: -webkit-baseline-middle; font-size: medium; font-family: Arial; width: 26px;">
                                                                <tbody>
                                                                    <tr>
                                                                        <td style="vertical-align: bottom;"><span
                                                                                style="display: inline-block; background-color: rgb(247, 201, 99);"><img
                                                                                    src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/link-icon-dark-2x.png"
                                                                                    alt="website" width="18"
                                                                                    style="display: block; background-image: linear-gradient(rgb(247, 201, 99), rgb(247, 201, 99));" /></span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                        <td style="padding: 0px; color: rgb(0, 0, 0);"><a
                                                                href="//www.vkr-ventures.com"
                                                                style="text-decoration: none; color: rgb(0, 0, 0); font-size: 14px;"><span>www.vkr-ventures.com</span></a>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="6" style="font-size: 12px; padding-top: 1rem; text-align: left;">
                            <div class="legal-content">
                                <p style="font-size: inherit; margin: 0px;">IMPORTANT: The contents of this email and
                                    any
                                    attachments are confidential. They are intended for the named recipient(s) only. If
                                    you have
                                    received this email by mistake, please notify the sender immediately and do not
                                    disclose the
                                    contents to anyone or make copies thereof.</p>
                                <br/>
                                <p style="font-size: inherit; margin: 0px;">​ATTN: By law all Real Estate Agents/Brokers
                                    are
                                    required to provide each consumer with the Working With Real Estate Agents Brochure.
                                    Please
                                    click on the link below to view the publication.</p>
                                <p style="font-size: inherit; margin: 0px;"><a
                                        href="http://www.ncrec.gov/Brochures/Work"
                                        style="color: #60BD68; text-decoration: underline;">http://www.ncrec.gov/Brochures/Work</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
`;

const SignaturePreview = () => {
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    const displayToast = (message) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 2000);
    };

    const copyRichText = (id) => {
        const signature = document.getElementById(id);
        
        try {
            const range = document.createRange();
            range.selectNode(signature);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
            displayToast('Rich text copied! You can now paste it into your email signature settings.');
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const copyHTML = async (id) => {
        const signature = document.getElementById(id).innerHTML;
        try {
            await navigator.clipboard.writeText(signature.trim());
            displayToast('HTML code copied! You can now paste it into any website footer.');
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    return (
        <div className="signature-preview-page">
            <div className="signature-container-box" style={{ marginBottom: "40px" }}>
                <div className="preview-label">Generic Signature Preview</div>
                <div id="signature-generic" className="signature-container" dangerouslySetInnerHTML={{ __html: genericHTML }}></div>

                <div className="actions">
                    <button className="btn-primary" onClick={() => copyRichText('signature-generic')}>Copy for Email (Rich Text)</button>
                    <button className="btn-secondary" onClick={() => copyHTML('signature-generic')}>Copy HTML Code</button>
                </div>
            </div>

            <div className="signature-container-box">
                <div className="preview-label">Support Team Signature Preview</div>
                <div id="signature-support" className="signature-container" dangerouslySetInnerHTML={{ __html: supportHTML }}></div>

                <div className="actions">
                    <button className="btn-primary" onClick={() => copyRichText('signature-support')}>Copy for Email (Rich Text)</button>
                    <button className="btn-secondary" onClick={() => copyHTML('signature-support')}>Copy HTML Code</button>
                </div>
            </div>

            <div id="toast" className={"toast " + (showToast ? "show" : "")}>{toastMessage}</div>
        </div>
    );
};

export default SignaturePreview;
