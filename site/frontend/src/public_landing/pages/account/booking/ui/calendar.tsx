"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, addMonths, subMonths } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import "react-day-picker/dist/style.css";

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    month,
    onMonthChange,
    ...props
}: React.ComponentProps<typeof DayPicker> & { month?: Date; onMonthChange?: (date: Date) => void }) {
    const { i18n } = useTranslation();
    const locale = i18n.language === 'ru' ? ru : enUS;

    // Use internal state if uncontrolled (fallback), though normally it's controlled by parent
    const [internalMonth, setInternalMonth] = React.useState(new Date());
    const currentMonth = month || internalMonth;
    const handleMonthChange = onMonthChange || setInternalMonth;

    const handlePrev = () => handleMonthChange(subMonths(currentMonth, 1));
    const handleNext = () => handleMonthChange(addMonths(currentMonth, 1));

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: 'clamp(10px, 2.2vw, 18px)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            width: '100%',
            maxWidth: '100%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            overflowX: 'hidden'
        }}>
            {/* External Custom Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '12px',
                width: '100%'
            }}>
                <button
                    onClick={handlePrev}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 'clamp(30px, 6vw, 40px)',
                        height: 'clamp(30px, 6vw, 40px)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#2563eb'
                    }}
                    type="button"
                    aria-label="Previous Month"
                >
                    <ChevronLeft style={{ width: '24px', height: '24px' }} />
                </button>

                <span style={{
                    fontSize: 'clamp(17px, 3.4vw, 24px)',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    color: '#0f172a',
                    padding: '0 6px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    minWidth: 'clamp(150px, 32vw, 220px)'
                }}>
                    {format(currentMonth, 'LLLL yyyy', { locale })}
                </span>

                <button
                    onClick={handleNext}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 'clamp(30px, 6vw, 40px)',
                        height: 'clamp(30px, 6vw, 40px)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#2563eb'
                    }}
                    type="button"
                    aria-label="Next Month"
                >
                    <ChevronRight style={{ width: '24px', height: '24px' }} />
                </button>
            </div>

            <DayPicker
                month={currentMonth}
                onMonthChange={handleMonthChange}
                showOutsideDays={showOutsideDays}
                className={['w-full max-w-full', className].filter(Boolean).join(' ')}
                locale={locale}
                modifiersClassNames={{
                    today: 'today-day'
                }}
                styles={{
                    root: { width: '100%', maxWidth: '100%' },
                    months: { width: '100%', maxWidth: '100%' },
                    month: { width: '100%', maxWidth: '100%' },
                    table: { margin: '0 auto', borderCollapse: 'separate', borderSpacing: '2px', width: 'min(100%, 720px)', maxWidth: '100%', tableLayout: 'fixed' },
                    head_cell: { width: '14.285%', height: 'clamp(34px, 6vw, 46px)', fontWeight: 600, color: '#4b5563', fontSize: 'clamp(14px, 1.8vw, 16px)', textAlign: 'center' },
                    cell: { width: '14.285%', height: 'clamp(40px, 6.2vw, 58px)', padding: 0, textAlign: 'center' },
                    day: { width: 'clamp(36px, 5.2vw, 52px)', height: 'clamp(36px, 5.2vw, 52px)', borderRadius: '50%', fontSize: 'clamp(15px, 2.1vw, 18px)', margin: '0 auto' },
                    caption: { display: 'none' },
                    caption_label: { display: 'none' }, // Disable caption label specifically
                    nav: { display: 'none' }
                }}
                {...props}
            />
            <style>{`
        .rdp-caption, .rdp-caption_label, .rdp-nav, .rdp-month_caption { display: none !important; }
        .DayPicker-Caption, .DayPicker-NavBar { display: none !important; }
        .rdp, .rdp-root, .rdp-months, .rdp-month, .rdp-table {
            width: 100% !important;
            max-width: 100% !important;
        }
        .rdp-table {
            table-layout: fixed !important;
            width: min(100%, 720px) !important;
            margin: 0 auto !important;
        }
        .rdp-day_button {
            width: clamp(36px, 5.2vw, 52px) !important;
            height: clamp(36px, 5.2vw, 52px) !important;
            margin: 0 auto !important;
        }

        /* Available Days (Base) - Highlighting slightly as requested */
        .rdp-day:not(.rdp-day_disabled):not(.rdp-day_selected):not(.today-day) {
            font-weight: 600;
            color: #334155; /* Slate 700 */
            background-color: #f8fafc; /* Very subtle background */
            border: 1px solid #e2e8f0; /* Subtle border */
            border-radius: 50%;
        }

        /* Unavailable/Disabled */
        .rdp-day_disabled {
            color: #cbd5e1 !important;
            opacity: 0.3 !important;
            background: transparent !important;
            border: none !important;
        }

        /* Outside Days - Make them visible */
        .rdp-day_outside {
            opacity: 1 !important; /* Fully visible */
        }

        /* Ensure outside days that are NOT disabled look like available days */
        .rdp-day_outside:not(.rdp-day_disabled) {
            cursor: pointer !important;
            color: #334155 !important; /* Match standard day color (was Slate 500) */
            font-weight: 600 !important; /* Match standard font weight */
            background-color: #f8fafc !important; 
            border: 1px solid #e2e8f0 !important;
            border-radius: 50%;
            opacity: 1 !important;
        }

        /* Today - Custom Class - Strong Outline & Fill */
        .today-day:not(.rdp-day_selected) {
            color: #7c3aed !important; /* Violet 600 */
            font-weight: 900 !important;
            background-color: #ede9fe !important; /* Violet 100 - Distinct fill */
            border: 2px solid #7c3aed !important; /* Explicit outline */
            /* border-radius: 50% !important; */
            opacity: 1 !important;
        }

        /* Selected - Solid */
        .rdp-day_selected {
            background-color: #7c3aed !important; /* Violet 600 */
            color: white !important;
            font-weight: bold;
            border-radius: 50%;
            border: none;
        }

        /* Hover for available */
        .rdp-day:not(.rdp-day_selected):not(.rdp-day_disabled):hover {
            background-color: #f3e8ff !important; /* Violet 50 */
            color: #7c3aed !important;
            border-color: #d8b4fe !important;
            font-weight: bold;
            border-radius: 50%;
        }
      `}</style>
        </div>
    );
}

export { Calendar };
