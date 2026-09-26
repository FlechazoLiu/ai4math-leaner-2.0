"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Course } from "@/lib/gen/leaner/v1/leaner_pb";
import OverviewTab from "@/components/course-management/OverviewTab";
import StudentsTab from "@/components/course-management/StudentsTab";
import AssistantsTab from "@/components/course-management/AssistantsTab";
import AssignmentsTab from "@/components/course-management/AssignmentsTab";
import NotificationsTab from "@/components/course-management/NotificationsTab";
import PostList from "@/components/PostList";
import GradebookTab from "@/components/course-management/GradebookTab";

interface CourseManagementTabsProps {
  courseId: string;
  userToken: string;
  userRole: number;
  course: Course;
}

export default function CourseManagementTabs({
  courseId,
  userToken,
  userRole,
  course,
}: CourseManagementTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const handleNavigateToTab = (tabName: string) => {
    setActiveTab(tabName);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="assistants">Assistant</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab
            course={course}
            onNavigateToTab={handleNavigateToTab}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="gradebook" className="space-y-4">
          <GradebookTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <StudentsTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="assistants" className="space-y-4">
          <AssistantsTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <AssignmentsTab courseId={courseId} userToken={userToken} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsTab courseId={courseId} userToken={userToken} />
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <PostList courseId={courseId} refreshTrigger={0} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
