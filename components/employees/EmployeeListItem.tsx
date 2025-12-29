import { Employee } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Eye, Pencil, Trash2, User as UserIcon } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import apiClient from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { formatIndianCurrency } from "@/lib/utils";

interface EmployeeListItemProps {
  employee: Employee;
  onAction: (employee: Employee, mode?: "view" | "edit") => void;
  onDelete?: (employee: Employee) => void;
}

const statusColor = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-muted text-muted-foreground",
  terminated: "bg-destructive text-destructive-foreground",
  "on-leave":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

export function EmployeeListItem({
  employee,
  onAction,
  onDelete,
}: EmployeeListItemProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiClient.deleteEmployee(employee.id || employee._id);
      if (res.success) {
        toast({ title: "Employee deleted", variant: "default" });
        if (onDelete) onDelete(employee);
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to delete employee",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e.message || "Failed to delete employee",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDialogOpen(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 transition-colors group hover:bg-accent/60 border-l-4 border-transparent hover:border-primary focus-within:bg-accent/70 focus-within:border-primary outline-none"
      style={{ borderTop: "none" }}
      tabIndex={0}
      aria-label={`Employee ${employee.name}`}
    >
      <Avatar>
        <AvatarImage
          src={employee?.documents?.photo || undefined}
          alt={employee.name}
        />
        <AvatarFallback>
          <UserIcon className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate max-w-[160px] md:max-w-[220px]">
            {employee.name}
          </span>
          <Badge className={statusColor[employee.status]}>
            {employee.status.replace(/-/g, " ")}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[320px]">
          {employee.email} &bull; {employee.phone}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {employee.category}{" "}
          {employee.salary
            ? `• ${formatIndianCurrency(employee.salary)}`
            : null}
        </div>
      </div>
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="View"
              onClick={() => onAction(employee, "view")}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit"
              onClick={() => onAction(employee, "edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <b>{employee.name}</b>? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
