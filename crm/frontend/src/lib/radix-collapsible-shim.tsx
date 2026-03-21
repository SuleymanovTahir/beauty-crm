import * as React from "react";

type CollapsibleContextValue = {
  disabled: boolean;
  open: boolean;
  setOpen: (nextOpen: boolean) => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

const useCollapsibleContext = () => {
  const context = React.useContext(CollapsibleContext);
  if (context !== null) {
    return context;
  }

  return {
    disabled: false,
    open: false,
    setOpen: () => {},
  };
};

type CollapsibleRootProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

const Root = React.forwardRef<HTMLDivElement, CollapsibleRootProps>(
  ({ children, defaultOpen = false, disabled = false, onOpenChange, open, ...props }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const isControlled = typeof open === "boolean";
    const currentOpen = isControlled ? open : uncontrolledOpen;

    const setOpen = React.useCallback(
      (nextOpen: boolean) => {
        if (!isControlled) {
          setUncontrolledOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
      },
      [isControlled, onOpenChange],
    );

    return (
      <CollapsibleContext.Provider value={{ disabled, open: currentOpen, setOpen }}>
        <div
          ref={ref}
          data-disabled={disabled ? "" : undefined}
          data-state={currentOpen ? "open" : "closed"}
          {...props}
        >
          {children}
        </div>
      </CollapsibleContext.Provider>
    );
  },
);

Root.displayName = "CollapsibleRoot";

type CollapsibleTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
};

const Trigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, disabled, onClick, ...props }, ref) => {
    const context = useCollapsibleContext();
    const isDisabled = context.disabled || Boolean(disabled);

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={context.open}
        data-disabled={isDisabled ? "" : undefined}
        data-state={context.open ? "open" : "closed"}
        disabled={isDisabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && !isDisabled) {
            context.setOpen(!context.open);
          }
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Trigger.displayName = "CollapsibleTrigger";

type CollapsibleContentProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  forceMount?: boolean;
};

const Content = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, forceMount = false, hidden, ...props }, ref) => {
    const context = useCollapsibleContext();
    const shouldRender = forceMount || context.open;

    if (!shouldRender) {
      return null;
    }

    return (
      <div
        ref={ref}
        data-state={context.open ? "open" : "closed"}
        hidden={hidden ?? !context.open}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Content.displayName = "CollapsibleContent";

const createCollapsibleScope = () => () => ({});

export { Content, Root, Trigger, createCollapsibleScope };
export const Collapsible = Root;
export const CollapsibleTrigger = Trigger;
export const CollapsibleContent = Content;
