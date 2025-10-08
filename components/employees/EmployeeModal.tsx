import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Employee,
  EmployeeCreateInput,
  EmployeeUpdateInput,
} from "@/lib/types";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm, FieldValues } from "react-hook-form";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface EmployeeModalProps {
  open: boolean;
  mode: "view" | "edit" | "create";
  employee: Employee | null;
  onClose: () => void;
  onUpdated: () => void;
}

type EmployeeFormValues = Omit<
  EmployeeCreateInput,
  "dateJoined" | "salary" | "status"
> & {
  dateJoined: string;
  salary: number | string;
  status: "active" | "inactive" | "terminated" | "on-leave";
};

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "terminated", label: "Terminated" },
  { value: "on-leave", label: "On Leave" },
];

export function EmployeeModal({
  open,
  mode,
  employee,
  onClose,
  onUpdated,
}: EmployeeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const getDefaultValues = (): EmployeeFormValues => {
    if (isCreate) {
      return {
        name: "",
        email: "",
        phone: "",
        address: {},
        category: "",
        dateJoined: new Date().toISOString().slice(0, 10),
        salary: 0,
        companyId: employee?.companyId || "",
        status: "active",
        documents: {},
        emergencyContact: {},
        workSchedule: {},
      };
    } else if (employee) {
      return {
        ...employee,
        dateJoined: employee.dateJoined
          ? new Date(employee.dateJoined).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        salary: employee.salary ?? 0,
        status: employee.status ?? "active",
      };
    } else {
      return {
        name: "",
        email: "",
        phone: "",
        address: {},
        category: "",
        dateJoined: new Date().toISOString().slice(0, 10),
        salary: 0,
        companyId: "",
        status: "active",
        documents: {},
        emergencyContact: {},
        workSchedule: {},
      };
    }
  };

  const form = useForm<EmployeeFormValues>({
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    form.reset(getDefaultValues());
    // eslint-disable-next-line
  }, [employee, isEdit, isView, isCreate, open]);

  const onSubmit = async (data: EmployeeFormValues) => {
    setLoading(true);
    try {
      let res;
      const payload = {
        ...data,
        salary:
          typeof data.salary === "string" ? Number(data.salary) : data.salary,
        dateJoined: data.dateJoined,
      };
      if (isCreate) {
        res = await apiClient.createEmployee(payload);
      } else if (isEdit && employee) {
        const empId = (employee.id || employee._id) ?? "";
        res = await apiClient.updateEmployee(empId, payload);
      }
      if (res?.success) {
        toast({
          title: isCreate ? "Employee created" : "Employee updated",
          variant: "default",
        });
        onUpdated();
      } else {
        toast({
          title: "Error",
          description: res?.error || "Failed to save employee",
          variant: "destructive",
        });
      }
    } catch (e) {
      const errMsg =
        typeof e === "object" && e && "message" in e
          ? (e as any).message
          : String(e);
      toast({
        title: "Error",
        description: errMsg || "Failed to save employee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isView && "View Employee"}
            {isEdit && "Edit Employee"}
            {isCreate && "Add Employee"}
          </DialogTitle>
          <DialogDescription>
            {isView && "Employee details"}
            {isEdit && "Update employee information"}
            {isCreate && "Fill the form to add a new employee"}
          </DialogDescription>
        </DialogHeader>
        {isView ? (
          <div className="space-y-3">
            <div>
              <b>Name:</b> {employee?.name}
            </div>
            <div>
              <b>Email:</b> {employee?.email}
            </div>
            <div>
              <b>Phone:</b> {employee?.phone}
            </div>
            <div>
              <b>Category:</b> {employee?.category}
            </div>
            <div>
              <b>Date Joined:</b>{" "}
              {employee?.dateJoined
                ? new Date(employee.dateJoined).toLocaleDateString()
                : "-"}
            </div>
            <div>
              <b>Salary:</b> ₹{employee?.salary?.toLocaleString()}
            </div>
            <div>
              <b>Status:</b> {employee?.status}
            </div>
            <div>
              <b>Address:</b>{" "}
              {employee?.address
                ? [
                    employee.address.street,
                    employee.address.city,
                    employee.address.state,
                    employee.address.pinCode,
                    employee.address.country,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : "-"}
            </div>
            <div>
              <b>Documents:</b>
              <div className="pl-2 text-sm">
                <div>
                  <b>Aadhar:</b> {employee?.documents?.aadhar || "-"}
                </div>
                <div>
                  <b>PAN:</b> {employee?.documents?.pan || "-"}
                </div>
                <div>
                  <b>Bank Account:</b>{" "}
                  {employee?.documents?.bankAccount
                    ? [
                        employee.documents.bankAccount.accountNumber,
                        employee.documents.bankAccount.ifscCode,
                        employee.documents.bankAccount.bankName,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : "-"}
                </div>
                <div>
                  <b>Photo:</b>{" "}
                  {employee?.documents?.photo ? (
                    <img
                      src={employee.documents.photo}
                      alt="Photo"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>
            <div>
              <b>Emergency Contact:</b>{" "}
              {employee?.emergencyContact
                ? [
                    employee.emergencyContact.name,
                    employee.emergencyContact.relationship,
                    employee.emergencyContact.phone,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : "-"}
            </div>
            <div>
              <b>Work Schedule:</b>{" "}
              {employee?.workSchedule
                ? [
                    employee.workSchedule.shiftType,
                    employee.workSchedule.workingDays
                      ? `${employee.workSchedule.workingDays} days`
                      : null,
                    employee.workSchedule.workingHours
                      ? `${employee.workSchedule.workingHours} hrs`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : "-"}
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={loading}
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={loading}
                          required
                          minLength={10}
                          maxLength={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={loading}
                          required
                          minLength={2}
                          maxLength={50}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateJoined"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Joined</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          disabled={loading}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salary</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          step={1}
                          disabled={loading}
                          required
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Address */}
              <div className="pt-2">
                <div className="font-semibold text-sm mb-1">Address</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.pinCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pin Code</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              {/* Documents */}
              <div className="pt-2">
                <div className="font-semibold text-sm mb-1">Documents</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="documents.aadhar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aadhar</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="documents.pan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="documents.bankAccount.accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="documents.bankAccount.ifscCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IFSC Code</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="documents.bankAccount.bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="documents.photo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photo URL</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              {/* Emergency Contact */}
              <div className="pt-2">
                <div className="font-semibold text-sm mb-1">
                  Emergency Contact
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="emergencyContact.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContact.relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContact.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              {/* Work Schedule */}
              <div className="pt-2">
                <div className="font-semibold text-sm mb-1">Work Schedule</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="workSchedule.shiftType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift Type</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={loading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select shift" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Day</SelectItem>
                              <SelectItem value="night">Night</SelectItem>
                              <SelectItem value="rotating">Rotating</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workSchedule.workingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Working Days</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            max={31}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workSchedule.workingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Working Hours</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            max={24}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? isCreate
                      ? "Creating..."
                      : "Saving..."
                    : isCreate
                    ? "Create"
                    : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
