import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva('ui-button', {
  variants: {
    variant: { default: 'ui-button-primary', secondary: 'ui-button-secondary', outline: 'ui-button-outline', ghost: 'ui-button-ghost' },
    size: { default: '', sm: 'ui-button-sm', lg: 'ui-button-lg', icon: 'ui-button-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component data-slot="button" type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
