"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "@animate-ui/react/primitives/base-ui/accordion"
import { cn } from "@/lib/utils"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b border-border/40", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:after:border-ring rounded-lg py-2.5 text-left text-sm font-medium hover:text-primary focus-visible:ring-2 group/accordion-trigger relative flex flex-1 items-center justify-between border border-transparent transition-all outline-none aria-disabled:pointer-events-none aria-disabled:opacity-50 cursor-pointer select-none",
          className
        )}
        {...props}
      >
        <div className="flex flex-1 items-center gap-2">{children}</div>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 transition-transform duration-350 ease-[cubic-bezier(0.215,0.61,0.355,1)] group-aria-expanded/accordion-trigger:rotate-180 text-muted-foreground group-hover/accordion-trigger:text-foreground h-4 w-4 ml-2"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="text-sm overflow-hidden"
      {...props}
    >
      <div
        className={cn(
          "pt-1 pb-3 text-xs text-muted-foreground leading-relaxed",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
