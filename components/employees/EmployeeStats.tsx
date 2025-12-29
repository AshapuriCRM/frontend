import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  UserCog,
  IndianRupee,
} from "lucide-react";
import { formatIndianNumber, formatIndianCurrency } from "@/lib/utils";

interface EmployeeStatsType {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  terminatedEmployees: number;
  onLeaveEmployees: number;
  averageSalary: number;
  totalSalaryExpense: number;
}

interface EmployeeStatsProps {
  stats: EmployeeStatsType | null;
  loading?: boolean;
}

const statCards: Array<{
  key: keyof EmployeeStatsType;
  label: string;
  icon: any;
  color: string;
  isCurrency?: boolean;
}> = [
  {
    key: "totalEmployees",
    label: "Total Employees",
    icon: Users,
    color: "text-primary",
  },
  {
    key: "activeEmployees",
    label: "Active",
    icon: UserCheck,
    color: "text-green-600 dark:text-green-400",
  },
  {
    key: "inactiveEmployees",
    label: "Inactive",
    icon: UserMinus,
    color: "text-muted-foreground",
  },
  {
    key: "terminatedEmployees",
    label: "Terminated",
    icon: UserX,
    color: "text-destructive",
  },
  {
    key: "onLeaveEmployees",
    label: "On Leave",
    icon: UserCog,
    color: "text-yellow-500 dark:text-yellow-400",
  },
  {
    key: "averageSalary",
    label: "Avg. Salary",
    icon: IndianRupee,
    color: "text-blue-600 dark:text-blue-400",
    isCurrency: true,
  },
  {
    key: "totalSalaryExpense",
    label: "Total Salary",
    icon: IndianRupee,
    color: "text-blue-600 dark:text-blue-400",
    isCurrency: true,
  },
];

export function EmployeeStats({ stats, loading }: EmployeeStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className="flex flex-col items-center p-3">
            <CardContent className="flex flex-col items-center gap-1 p-0">
              <span className={`rounded-full bg-muted p-2 mb-1 ${card.color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs text-muted-foreground">
                {card.label}
              </span>
              {loading ? (
                <Skeleton className="h-5 w-12 mt-1" />
              ) : (
                <span className="font-semibold text-base">
                  {card.isCurrency
                    ? formatIndianCurrency(Math.round(stats?.[card.key] || 0))
                    : stats
                    ? card.key === "totalEmployees" ||
                      card.key === "activeEmployees" ||
                      card.key === "inactiveEmployees" ||
                      card.key === "terminatedEmployees" ||
                      card.key === "onLeaveEmployees"
                      ? stats[card.key] ?? "-"
                      : formatIndianNumber(stats[card.key] ?? 0)
                    : "-"}
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
