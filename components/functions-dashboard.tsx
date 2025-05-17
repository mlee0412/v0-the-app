"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package,
  ClipboardList,
  Brain,
  ShoppingCart,
  Users,
  BarChart,
  Calendar,
  Settings,
  MessageSquare,
  Warehouse,
  Truck,
  Boxes,
  Clipboard,
  CheckSquare,
  Clock,
  Bot,
  Sparkles,
  Database,
} from "lucide-react"

interface FunctionsDashboardProps {
  open: boolean
  onClose: () => void
}

export function FunctionsDashboard({ open, onClose }: FunctionsDashboardProps) {
  const [activeTab, setActiveTab] = useState("main")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 bg-black/90 border border-cyan-500/50 shadow-lg shadow-cyan-500/20 backdrop-blur-sm overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-cyan-800/50">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              Functions Dashboard
            </h2>
            <p className="text-gray-400 text-sm">Access system functions and utilities</p>
          </div>

          <Tabs defaultValue="main" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b border-cyan-800/50 px-4">
              <TabsList className="bg-transparent h-12">
                <TabsTrigger
                  value="main"
                  className="data-[state=active]:bg-cyan-950/50 data-[state=active]:text-cyan-400 data-[state=active]:shadow-none"
                >
                  Main
                </TabsTrigger>
                <TabsTrigger
                  value="inventory"
                  className="data-[state=active]:bg-cyan-950/50 data-[state=active]:text-cyan-400 data-[state=active]:shadow-none"
                >
                  Inventory Manager
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="data-[state=active]:bg-cyan-950/50 data-[state=active]:text-cyan-400 data-[state=active]:shadow-none"
                >
                  Task Manager
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="data-[state=active]:bg-cyan-950/50 data-[state=active]:text-cyan-400 data-[state=active]:shadow-none"
                >
                  AI
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <TabsContent value="main" className="h-full mt-0">
                <div className="grid grid-cols-3 gap-6 h-full">
                  {/* Bento box style buttons */}
                  <FunctionCard
                    title="Inventory"
                    description="Manage inventory and stock levels"
                    icon={<Package className="h-8 w-8" />}
                    gradient="from-blue-500 to-cyan-500"
                  />
                  <FunctionCard
                    title="Staff"
                    description="Manage staff and schedules"
                    icon={<Users className="h-8 w-8" />}
                    gradient="from-purple-500 to-pink-500"
                  />
                  <FunctionCard
                    title="Reports"
                    description="View business analytics and reports"
                    icon={<BarChart className="h-8 w-8" />}
                    gradient="from-amber-500 to-orange-500"
                  />
                  <FunctionCard
                    title="Orders"
                    description="Manage customer orders"
                    icon={<ShoppingCart className="h-8 w-8" />}
                    gradient="from-emerald-500 to-green-500"
                  />
                  <FunctionCard
                    title="Calendar"
                    description="View and manage events"
                    icon={<Calendar className="h-8 w-8" />}
                    gradient="from-rose-500 to-red-500"
                  />
                  <FunctionCard
                    title="Settings"
                    description="Configure system settings"
                    icon={<Settings className="h-8 w-8" />}
                    gradient="from-indigo-500 to-violet-500"
                  />
                  <FunctionCard
                    title="Messages"
                    description="Internal communication system"
                    icon={<MessageSquare className="h-8 w-8" />}
                    gradient="from-teal-500 to-cyan-500"
                  />
                  <FunctionCard
                    title="Tasks"
                    description="Manage and assign tasks"
                    icon={<ClipboardList className="h-8 w-8" />}
                    gradient="from-fuchsia-500 to-pink-500"
                  />
                  <FunctionCard
                    title="AI Assistant"
                    description="Get help from AI"
                    icon={<Brain className="h-8 w-8" />}
                    gradient="from-cyan-400 to-fuchsia-400"
                  />
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="h-full mt-0">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-cyan-500/30 shadow-lg h-full flex flex-col">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4">Inventory Management</h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <Warehouse className="h-10 w-10 mr-4 text-cyan-400" />
                      <div>
                        <h4 className="font-bold text-white">Stock Management</h4>
                        <p className="text-sm text-gray-400">Track and manage inventory levels</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <Truck className="h-10 w-10 mr-4 text-purple-400" />
                      <div>
                        <h4 className="font-bold text-white">Suppliers</h4>
                        <p className="text-sm text-gray-400">Manage supplier relationships</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <Boxes className="h-10 w-10 mr-4 text-amber-400" />
                      <div>
                        <h4 className="font-bold text-white">Categories</h4>
                        <p className="text-sm text-gray-400">Organize inventory by category</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <Database className="h-10 w-10 mr-4 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-white">Reports</h4>
                        <p className="text-sm text-gray-400">Generate inventory reports</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-center text-cyan-300">
                      Inventory management features coming soon. This area will contain tools for tracking stock,
                      managing suppliers, and generating reports.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="h-full mt-0">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-cyan-500/30 shadow-lg h-full flex flex-col">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4">Task Management</h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <Clipboard className="h-10 w-10 mr-4 text-cyan-400" />
                      <div>
                        <h4 className="font-bold text-white">Task List</h4>
                        <p className="text-sm text-gray-400">View and manage all tasks</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <CheckSquare className="h-10 w-10 mr-4 text-purple-400" />
                      <div>
                        <h4 className="font-bold text-white">Assignments</h4>
                        <p className="text-sm text-gray-400">Assign tasks to staff members</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <Clock className="h-10 w-10 mr-4 text-amber-400" />
                      <div>
                        <h4 className="font-bold text-white">Scheduling</h4>
                        <p className="text-sm text-gray-400">Schedule tasks and set deadlines</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <BarChart className="h-10 w-10 mr-4 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-white">Progress</h4>
                        <p className="text-sm text-gray-400">Track task completion and progress</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-center text-cyan-300">
                      Task management features coming soon. This area will contain tools for creating, assigning, and
                      tracking tasks for your team.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="h-full mt-0">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-cyan-500/30 shadow-lg h-full flex flex-col">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4">AI Tools</h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <Bot className="h-10 w-10 mr-4 text-cyan-400" />
                      <div>
                        <h4 className="font-bold text-white">AI Assistant</h4>
                        <p className="text-sm text-gray-400">Get help with tasks and questions</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <BarChart className="h-10 w-10 mr-4 text-purple-400" />
                      <div>
                        <h4 className="font-bold text-white">Predictive Analytics</h4>
                        <p className="text-sm text-gray-400">AI-powered business insights</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <Sparkles className="h-10 w-10 mr-4 text-amber-400" />
                      <div>
                        <h4 className="font-bold text-white">Smart Automation</h4>
                        <p className="text-sm text-gray-400">Automate routine tasks</p>
                      </div>
                    </div>

                    <div className="bg-black/60 border border-cyan-800/50 rounded-lg p-4 flex items-center">
                      <MessageSquare className="h-10 w-10 mr-4 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-white">Chat Interface</h4>
                        <p className="text-sm text-gray-400">Conversational AI interface</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-center text-cyan-300">
                      AI tools coming soon. This area will contain advanced AI features to help optimize your business
                      operations and provide intelligent insights.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface FunctionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  gradient: string
}

function FunctionCard({ title, description, icon, gradient }: FunctionCardProps) {
  return (
    <button className="bg-black/60 border border-cyan-800/50 rounded-lg p-6 flex flex-col items-center text-center hover:bg-black/80 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20">
      <div className={`bg-gradient-to-br ${gradient} p-3 rounded-full mb-4`}>{icon}</div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </button>
  )
}
