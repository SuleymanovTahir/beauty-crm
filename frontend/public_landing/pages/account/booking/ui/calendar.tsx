"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { useTranslation } from "react-i18next";

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    const { i18n } = useTranslation();
    const locale = i18n.language === 'ru' ? ru : enUS;

    // Custom Caption Component with INLINE STYLES to guarantee layout
    const CustomCaption = ({ displayMonth }: { displayMonth: Date }) => {
        const { goToMonth, nextMonth, previousMonth } = useNavigation();

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center', /* Center everything: arrow - title - arrow */
                gap: '24px', /* Space between arrow and text */
                padding: '0 8px 16px 8px',
                width: '100%',
                position: 'relative'
            }}>
                <button
                    disabled={!previousMonth}
                    onClick={() => previousMonth && goToMonth(previousMonth)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none', // Removed border as per 'good' screenshot usually has clean look or subtle
                        background: 'transparent',
                        cursor: previousMonth ? 'pointer' : 'default',
                        opacity: previousMonth ? 1 : 0.3,
                        color: '#64748b'
                    }}
                    className="hover:bg-slate-100 transition-colors"
                >
                    <ChevronLeft style={{ width: '20px', height: '20px', strokeWidth: 2.5, color: '#2563eb' }} /> {/* Blue color like in screenshot */}
                </button>

                <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    color: '#0f172a',
                    textAlign: 'center',
                    minWidth: '130px' // Prevent layout shift
                }}>
                    {format(displayMonth, 'LLLL yyyy', { locale })}
                </span>

                <button
                    disabled={!nextMonth}
                    onClick={() => nextMonth && goToMonth(nextMonth)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        cursor: nextMonth ? 'pointer' : 'default',
                        opacity: nextMonth ? 1 : 0.3,
                        color: '#64748b'
                    }}
                    className="hover:bg-slate-100 transition-colors"
                >
                    <ChevronRight style={{ width: '20px', height: '20px', strokeWidth: 2.5, color: '#2563eb' }} />
                </button>
            </div>
        );
    };

    return (
        <div style={{ padding: '16px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
            <DayPicker
                showOutsideDays={showOutsideDays}
                className={className}
                locale={locale}
                components={{
                    Caption: CustomCaption
                }}
                // Using inline styles for inner elements via matching classNames to empty strings 
                // and relying on style injection or native RDP styles where possible, 
                // but overriding specific parts with styles prop
                styles={{
                    head_cell: { textTransform: 'lowercase', color: '#64748b', fontSize: '0.9rem', fontWeight: 500, paddingBottom: '8px' },
                    cell: { fontSize: '0.95rem', height: '40px', width: '40px' },
                    day: { borderRadius: '50%', height: '40px', width: '40px' },
                    table: { margin: '0 auto' } // Center the table itself
                }}
                {...props}
            />
            {/* Fallback styles for selected state if Tailwind fails - enhanced for newer look */}
            <style>{`
        .rdp-day_selected { 
            background-color: #2563eb !important; /* Blue primary color */
            color: white !important;
            font-weight: bold;
        }
        .rdp-day_today:not(.rdp-day_selected) { 
            background-color: #f1f5f9;
            font-weight: bold; 
            color: #2563eb;
        }
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
            background-color: #eff6ff;
            color: #2563eb;
        }
      `}</style>
        </div>
    );
}

export { Calendar };
