import { cn } from '@/lib/utils';
import * as React from 'react';

interface ProgressStepsProps extends React.HTMLAttributes<HTMLDivElement> {
  currentStep?: number;
  children: React.ReactNode;
}

interface ProgressStepProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  completed?: boolean;
  children?: React.ReactNode;
}

const ProgressStepsContext = React.createContext<{
  currentStep: number;
  stepCount: number;
  registerStep: (index: number) => void;
}>({
  currentStep: 1,
  stepCount: 0,
  registerStep: () => {},
});

const ProgressSteps = React.forwardRef<HTMLDivElement, ProgressStepsProps>(
  ({ currentStep = 1, className, children, ...props }, ref) => {
    const [stepCount, setStepCount] = React.useState(0);

    const registerStep = React.useCallback((index: number) => {
      setStepCount((prev) => Math.max(prev, index + 1));
    }, []);

    return (
      <ProgressStepsContext.Provider
        value={{ currentStep, stepCount, registerStep }}
      >
        <div
          ref={ref}
          className={cn('flex flex-col space-y-4', className)}
          {...props}
        >
          {children}
        </div>
      </ProgressStepsContext.Provider>
    );
  },
);

ProgressSteps.displayName = 'ProgressSteps';

const ProgressStep = React.forwardRef<HTMLDivElement, ProgressStepProps>(
  ({ title, description, completed, className, children, ...props }, ref) => {
    const { currentStep, stepCount, registerStep } =
      React.useContext(ProgressStepsContext);
    const stepRef = React.useRef<HTMLDivElement>(null);
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
      if (stepRef.current) {
        const newIndex = Array.from(
          stepRef.current.parentElement?.children || [],
        ).indexOf(stepRef.current);
        setIndex(newIndex);
        registerStep(newIndex);
      }
    }, [registerStep]);

    const isActive = index + 1 === currentStep;
    const showChildren = !completed && isActive;

    return (
      <div
        ref={stepRef}
        className={cn('flex items-start', className)}
        {...props}
      >
        <div className="relative flex items-center">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border-2',
              {
                'border-primary bg-primary text-primary-foreground':
                  index + 1 < currentStep || completed,
                'border-primary bg-background': isActive,
                'border-muted bg-muted': index + 1 > currentStep,
              },
            )}
          >
            {index + 1 < currentStep || completed ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <span className="text-sm font-semibold">{index + 1}</span>
            )}
          </div>
          {index < stepCount - 1 && (
            <div
              className={cn(
                'absolute left-3 top-6 h-[calc(100%+16px)] w-[2px]',
                {
                  'bg-primary': index + 1 < currentStep,
                  'bg-muted': index + 1 >= currentStep,
                },
              )}
            />
          )}
        </div>
        <div className="ml-3 min-h-6 flex flex-col justify-center gap-2 items-start">
          <div className="text-base font-semibold">{title}</div>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
          {showChildren && children}
        </div>
      </div>
    );
  },
);

ProgressStep.displayName = 'ProgressStep';

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="24"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export { ProgressSteps, ProgressStep };
