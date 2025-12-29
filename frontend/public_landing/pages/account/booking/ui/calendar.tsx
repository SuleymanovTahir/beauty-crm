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
            padding: '16px',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            width: 'fit-content',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            {/* External Custom Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '10px', // Reduced from 10px to bring closer to calendar
                width: '100%'
            }}>
                <button
                    onClick={handlePrev}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
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
                    fontSize: '18px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    color: '#0f172a',
                    padding: '0 8px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    minWidth: '160px' // Ensure enough space so year doesn't jump
                }}>
                    {format(currentMonth, 'LLLL yyyy', { locale })}
                </span>

                <button
                    onClick={handleNext}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
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
                className={className}
                locale={locale}
                styles={{
                    table: { margin: '0 auto', borderCollapse: 'collapse' },
                    head_cell: { width: '40px', height: '40px', fontWeight: 500, color: '#64748b' },
                    cell: { width: '40px', height: '40px', padding: 0 },
                    day: { width: '40px', height: '40px', borderRadius: '50%', fontSize: '15px' },
                    caption: { display: 'none' },
                    caption_label: { display: 'none' }, // Disable caption label specifically
                    nav: { display: 'none' }
                }}
                {...props}
            />
            <style>{`
        .rdp-caption, .rdp-caption_label, .rdp-nav, .rdp-month_caption { display: none !important; }
        .DayPicker-Caption, .DayPicker-NavBar { display: none !important; }

        /* Available Days (Base) - Highlighting slightly as requested */
        .rdp-day:not(.rdp-day_disabled):not(.rdp-day_selected):not(.rdp-day_today) {
            font-weight: 600;
            color: #334155; /* Slate 700 */
            background-color: #f8fafc; /* Very subtle background */
            border: 1px solid #e2e8f0; /* Subtle border */
            border-radius: 50%;
        }

        /* Unavailable/Disabled - Very faint */
        .rdp-day_disabled {
            color: #cbd5e1 !important; /* Slate 300 */
            opacity: 0.3 !important;
            background: transparent !important;
            border: none !important;
        }

        /* Today - Strong Outline */
        .rdp-day_today:not(.rdp-day_selected) {
            color: #7c3aed; /* Violet 600 */
            font-weight: 900;
            background: transparent;
            border: 2px solid #7c3aed; /* Explicit outline */
            border-radius: 50%;
        }

        /* Selected - Solid */
        .rdp-day_selected { 
            background-color: #7c3aed !important; /* Violet 600 to match theme better */
            color: white !important; 
            font-weight: bold;
            border-radius: 50%;
            border: none;
        }

        /* Hover for available */
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
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
