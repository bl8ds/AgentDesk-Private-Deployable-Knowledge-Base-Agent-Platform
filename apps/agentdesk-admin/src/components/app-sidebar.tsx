import {
  FileTextIcon,
  GaugeIcon,
  BookOpenIcon,
  Settings2Icon,
  ScrollTextIcon,
  ChartNoAxesCombinedIcon,
  ListIcon,
  UsersRoundIcon,
  ActivityIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from 'lucide-react'
import { Link, usePathname } from '../lib/router'
import { NavUser } from './nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navGroups = [
  {
    label: '知识库内容',
    items: [
      { href: '/', label: '知识库文档', icon: FileTextIcon },
    ],
  },
  {
    label: '用量与审计',
    items: [
      { href: '/usage', label: '用量看板', icon: ChartNoAxesCombinedIcon },
      { href: '/usage/list', label: '用量明细', icon: ListIcon },
      { href: '/audit', label: '审计日志', icon: ScrollTextIcon },
      { href: '/sessions', label: '会话管理', icon: UsersRoundIcon },
      { href: '/quotas', label: '用量配额', icon: GaugeIcon },
    ],
  },
  {
    label: '系统设置',
    items: [
      { href: '/settings/ai', label: '模型配置', icon: Settings2Icon },
      { href: '/settings/tools', label: 'Agent 工具', icon: WrenchIcon },
      { href: '/settings/compliance', label: '内容安全', icon: ShieldCheckIcon },
      { href: '/system/health', label: '系统健康', icon: ActivityIcon },
    ],
  },
] as const

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-10">
              <Link href="/">
                <div className="sidebar-brand-mark flex aspect-square size-8 items-center justify-center rounded-lg">
                  <BookOpenIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">AgentDesk</span>
                  <span className="truncate text-xs text-muted-foreground">
                    管理后台
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.href === '/'
                          ? pathname === '/'
                          : item.href === '/usage'
                            ? pathname === '/usage'
                            : pathname.startsWith(item.href)
                      }
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}