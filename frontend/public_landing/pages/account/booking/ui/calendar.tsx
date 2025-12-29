"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation } from "react-day-picker";
import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import "react-day-picker/dist/style.css";

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    const { i18n } = useTranslation();
    const locale = i18n.language === 'ru' ? ru : enUS;

    // Custom Caption: Explicitly renders [Prev Arrow] [Month Label] [Next Arrow]
    // This guarantees the visual order the user wants.
    const CustomCaption = ({ displayMonth }: { displayMonth: Date }) => {
        const { goToMonth, nextMonth, previousMonth } = useNavigation();

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                padding: '16px 8px',
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
                        border: 'none',
                        background: 'transparent',
                        cursor: previousMonth ? 'pointer' : 'default',
                        opacity: previousMonth ? 1 : 0.2,
                        color: '#2563eb'
                    }}
                    type="button"
                >
                    <ChevronLeft style={{ width: '24px', height: '24px' }} />
                </button>

                <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    color: '#0f172a',
                    minWidth: '140px',
                    textAlign: 'center'
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
                        border: 'none',
                        background: 'transparent',
                        cursor: nextMonth ? 'pointer' : 'default',
                        opacity: nextMonth ? 1 : 0.2,
                        color: '#2563eb'
                    }}
                    type="button"
                >
                    <ChevronRight style={{ width: '24px', height: '24px' }} />
                </button>
            </div>
        );
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            width: 'fit-content',
            margin: '0 auto'
        }}>
            <DayPicker
                showOutsideDays={showOutsideDays}
                className={className}
                locale={locale}
                components={{
                    Caption: CustomCaption
                }}
                // Using explicit styles object for Grid to ensure table integrity
                styles={{
                    table: { margin: '0 auto', borderCollapse: 'collapse' },
                    head_cell: { width: '40px', height: '40px', fontWeight: 500, color: '#64748b' },
                    cell: { width: '40px', height: '40px', padding: 0 },
                    day: { width: '40px', height: '40px', borderRadius: '50%', fontSize: '15px' }
                }}
                // Minimal overrides for colors via style tag
                {...props}
            />
            <style>{`
        .rdp-day_selected { 
            background-color: #2563eb !important; 
            color: white !important; 
            font-weight: bold;
        }
        .rdp-day_today:not(.rdp-day_selected) {
            background-color: #f1f5f9;
            color: #2563eb;
            font-weight: bold;
        }
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
            background-color: #eff6ff !important;
            color: #2563eb !important;
        }
      `}</style>
        </div>
    );
}

export { Calendar };
