"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  Users,
  Server,
  Table2,
  MessageSquare,
  Bell,
  BellOff,
  AlertTriangle,
  Info,
  Settings,
  UserPlus,
  Layers,
  MoveHorizontal,
} from "lucide-react"

export function UserManual() {
  const [selectedSection, setSelectedSection] = useState("basics")

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium text-cyan-400 flex items-center gap-2">
        <Info className="h-4 w-4" />
        Space Billiards User Manual
      </h2>

      <Tabs value={selectedSection} onValueChange={setSelectedSection} className="w-full">
        <TabsList className="grid grid-cols-4 bg-gray-800 h-7">
          <TabsTrigger value="basics" className="data-[state=active]:bg-gray-700 h-7 text-xs">
            Basics
          </TabsTrigger>
          <TabsTrigger value="tables" className="data-[state=active]:bg-gray-700 h-7 text-xs">
            Tables
          </TabsTrigger>
          <TabsTrigger value="groups" className="data-[state=active]:bg-gray-700 h-7 text-xs">
            Groups
          </TabsTrigger>
          <TabsTrigger value="admin" className="data-[state=active]:bg-gray-700 h-7 text-xs">
            Admin
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[300px] mt-2 pr-4">
          <TabsContent value="basics" className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Table2 className="h-3 w-3" />
                Table Management
              </h3>
              <p className="text-xs text-gray-300">
                Space Billiards is a management system for billiards halls. The main interface displays all tables with
                their current status.
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>
                  <span className="text-green-400">Green tables</span> are active sessions
                </li>
                <li>
                  <span className="text-yellow-400">Yellow tables</span> have less than 15 minutes remaining
                </li>
                <li>
                  <span className="text-red-400">Red tables</span> are in overtime
                </li>
                <li>
                  <span className="text-cyan-400">Blue tables</span> are inactive
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Session Management
              </h3>
              <p className="text-xs text-gray-300">
                To manage a table, click on it to open the table dialog. From there you can:
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Start or end a session</li>
                <li>Add or subtract time</li>
                <li>Update guest count</li>
                <li>Assign a server</li>
                <li>Add notes</li>
              </ul>
              <p className="text-xs text-gray-300">
                <strong>Long press</strong> on an active table to view its session logs.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Bell className="h-3 w-3" />
                Warning Notifications
              </h3>
              <p className="text-xs text-gray-300">
                When a table has less than 15 minutes remaining, it will turn yellow and start pulsing. You can toggle
                the animation by clicking the bell icon that appears next to the timer.
              </p>
              <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                <div className="flex items-center gap-1">
                  <Bell className="h-3 w-3 text-yellow-400" />
                  <span className="text-xs text-yellow-400">Animation ON</span>
                </div>
                <div className="flex items-center gap-1">
                  <BellOff className="h-3 w-3 text-yellow-400" />
                  <span className="text-xs text-yellow-400">Animation OFF</span>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="tables" className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Managing Guests
              </h3>
              <p className="text-xs text-gray-300">
                Before starting a session, you must set the number of guests and assign a server.
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Use the +/- buttons to adjust guest count</li>
                <li>Click the number to open a numeric keypad for direct input</li>
                <li>The guest count is displayed on the table card with the person icon</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Server className="h-3 w-3" />
                Server Assignment
              </h3>
              <p className="text-xs text-gray-300">
                Each active table should have a server assigned to it. Servers can be managed in the Settings dialog.
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Click on a server name to assign them to the table</li>
                <li>The assigned server is displayed on the table card</li>
                <li>Servers can be enabled or disabled in the Settings</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time Management
              </h3>
              <p className="text-xs text-gray-300">
                You can add or subtract time from active sessions. The remaining time is prominently displayed on the
                table card.
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Use the +5, +15, +30, +60 buttons to add minutes</li>
                <li>Use the -5, -15, -30, -60 buttons to subtract minutes</li>
                <li>Tables will automatically go into overtime if time runs out</li>
                <li>Overtime is indicated by a negative time value and red color</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Table Notes
              </h3>
              <p className="text-xs text-gray-300">
                You can add notes to tables to keep track of important information. Note templates can be managed in the
                Settings dialog.
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Select a note template from the Notes tab in the table dialog</li>
                <li>Notes are displayed on the table card with a message icon</li>
                <li>Create custom note templates in the Settings</li>
              </ul>
            </section>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Table Groups
              </h3>
              <p className="text-xs text-gray-300">
                You can group tables together to manage them as a single unit. This is useful for large parties that
                occupy multiple tables.
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Go to the Group tab in the table dialog</li>
                <li>Select multiple tables to include in the group</li>
                <li>Click "Create Group" to group the selected tables</li>
                <li>Grouped tables share the same timer and status</li>
                <li>Groups are color-coded for easy identification</li>
                <li>To remove a table from a group, use the "Remove from Group" button</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <MoveHorizontal className="h-3 w-3" />
                Moving Tables
              </h3>
              <p className="text-xs text-gray-300">
                You can move a session from one table to another. This is useful when customers need to change tables.
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Go to the Move tab in the table dialog</li>
                <li>Select the destination table</li>
                <li>Click "Move Table" to transfer all session data</li>
                <li>The source table will be reset to inactive</li>
              </ul>
            </section>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Settings className="h-3 w-3" />
                System Settings
              </h3>
              <p className="text-xs text-gray-300">
                Administrators can access system settings to manage servers, note templates, and more.
              </p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Click the Settings button in the top right</li>
                <li>Manage servers in the Servers tab</li>
                <li>Create and edit note templates in the Notes tab</li>
                <li>Access this user manual in the User Manual tab</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                User Management
              </h3>
              <p className="text-xs text-gray-300">Administrators can manage user accounts and permissions.</p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Click "User Management" in the Settings dialog</li>
                <li>Create, edit, and delete user accounts</li>
                <li>Assign roles: Admin, Server, or Viewer</li>
                <li>Set specific permissions for each user</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Day Management
              </h3>
              <p className="text-xs text-gray-300">Administrators can start and end the business day.</p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Click "Start Day" at the beginning of business hours</li>
                <li>Click "End Day" at the end of business hours</li>
                <li>Starting a day resets all tables</li>
                <li>Ending a day generates a summary report</li>
                <li>All active sessions are automatically ended when ending the day</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-fuchsia-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                System Logs
              </h3>
              <p className="text-xs text-gray-300">Administrators can view system logs to track all activities.</p>
              <ul className="space-y-1 text-xs text-gray-300 list-disc pl-4">
                <li>Click "View Logs" in the Settings dialog</li>
                <li>Filter logs by table, action, or time range</li>
                <li>Sort logs by time, table, or action</li>
                <li>Export logs for record-keeping</li>
              </ul>
            </section>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
