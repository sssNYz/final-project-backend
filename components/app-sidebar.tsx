"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDatabase,
  IconInnerShadowTop,
  IconListDetails,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  mainNav: [
    {
      title: "บัญชีผู้ใช้งาน",
      url: "/dashboard/accounts",
      icon: IconUsers,
      children: [
        {
          title: "เพิ่มบัญชีผู้ดูแลระบบ",
          url: "/dashboard/accounts/new-admin",
        },
      ],
    },
    {
      title: "ข้อมูลยา",
      url: "/dashboard/medicines",
      icon: IconDatabase,
    },
    {
      title: "ปริมาณข้อมูล",
      url: "/dashboard",
      icon: IconChartBar,
    },
    {
      title: "รายการคำร้อง",
      url: "/dashboard/requests",
      icon: IconListDetails,
    },
  ],
}

// Sidebar หลักของหน้า Dashboard ฝั่งแอดมิน
// แสดงเมนูนำทางไปยังหน้าจัดการบัญชีผู้ใช้, ข้อมูลยา, ปริมาณข้อมูล และรายการคำร้อง
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">MediBuddy</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.mainNav} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
