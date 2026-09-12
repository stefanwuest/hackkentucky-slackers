import * as React from 'react'

import { cn } from '../../lib/utils'

function Sidebar({ className, ...props }: React.ComponentProps<'aside'>) {
  return (
    <aside
      data-slot="sidebar"
      className={cn('bg-card text-card-foreground flex flex-col rounded-2xl border shadow-xs', className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 border-b p-4', className)} {...props} />
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" className={cn('flex flex-1 flex-col gap-4 p-4', className)} {...props} />
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'section'>) {
  return <section data-slot="sidebar-group" className={cn('flex flex-col gap-3', className)} {...props} />
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-label" className={cn('flex flex-col gap-1', className)} {...props} />
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('border-t p-4', className)} {...props} />
}

export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader }
