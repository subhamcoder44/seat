
"use client";

import { useAppState } from "@/hooks/use-app-state";
import { Card } from "@/components/ui/card";

export function SeatingAllocationStatus() {
  const { students } = useAppState();

  const getStatus = (seatingPlan: string | undefined) => {
    switch (seatingPlan) {
      case "assigned":
        return {
          text: "Rooms Assigned",
          className: "text-green-500",
        };
      case "pending":
        return {
          text: "Allocation Pending",
          className: "text-yellow-500",
        };
      case "needed":
        return {
          text: "Seating Plan Needed",
          className: "text-red-500",
        };
      default:
        return {
          text: "Not Started",
          className: "text-gray-500",
        };
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">
        Seating Allocation Status Overview
      </h2>
      <div className="space-y-2">
        {students.map((student, idx) => {
          const status = getStatus(student.seatingPlan);
          return (
            <div
              key={student.id || `student-${idx}`}
              className="flex justify-between items-center"
            >
              <p>
                {student.name} (planned: {student.totalStudents} students)
              </p>
              <p className={`font-semibold ${status.className}`}>
                {status.text}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
