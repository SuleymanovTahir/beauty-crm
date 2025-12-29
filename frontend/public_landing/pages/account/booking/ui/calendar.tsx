"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row gap-2 justify-center",
                month: "flex flex-col gap-4 w-full",
                month_caption: "flex justify-center pt-1 relative items-center w-full mb-4",
                caption_label: "text-base font-bold text-gray-900",
                nav: "flex items-center gap-1",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 z-10 rounded-lg"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 z-10 rounded-lg"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "flex justify-between",
                weekday: "text-muted-foreground w-10 font-medium text-[0.8rem] text-center",
                weeks: "flex flex-col gap-1 mt-2",
                week: "flex w-full justify-between",
                day: "h-10 w-10 text-center text-sm p-0 relative flex items-center justify-center",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-10 w-10 p-0 font-normal rounded-xl aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:opacity-100"
                ),
                selected: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl",
                today: "bg-accent text-accent-foreground rounded-xl",
                outside: "text-muted-foreground/30 opacity-50",
                disabled: "text-muted-foreground/20 opacity-30 cursor-not-allowed",
                range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
                    return <Icon className="size-4" />;
                },
            }}
            {...props}
        />
    );
}

export { Calendar };
