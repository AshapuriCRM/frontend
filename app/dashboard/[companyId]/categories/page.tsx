// CategoriesPageClient.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatedPage } from '@/components/ui/animated-page';
import { mockJobCategories } from '@/data/mock-data';
import { JobCategory } from '@/lib/types';
import { Plus, Pencil, Trash2, Settings, Check } from 'lucide-react';

interface CategoriesPageClientProps {
  params: { companyId: string };
}

export default function CategoriesPageClient({ params }: CategoriesPageClientProps) {
  const [categories, setCategories] = useState<JobCategory[]>(mockJobCategories.filter(c => c.companyId === params.companyId));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<JobCategory | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    baseWage: 0,
    wageType: 'monthly' as 'monthly' | 'daily'
  });

  // Global GST, PF, ESIC rates - editable
  const [gstRate, setGstRate] = useState(18);
  const [pfRate, setPfRate] = useState(12);
  const [esicRate, setEsicRate] = useState(0.75);

  const resetForm = () => {
    setFormData({
      title: '',
      baseWage: 0,
      wageType: 'monthly'
    });
    setEditingCategory(null);
  };

  const handleSubmit = () => {
    if (editingCategory) {
      // Update existing category
      setCategories(prev => prev.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, ...formData }
          : cat
      ));
    } else {
      // Add new category
      const newCategory: JobCategory = {
        id: Date.now().toString(),
        ...formData,
        companyId: params.companyId
      };
      setCategories(prev => [...prev, newCategory]);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (category: JobCategory) => {
    setEditingCategory(category);
    setFormData({
      title: category.title,
      baseWage: category.baseWage,
      wageType: category.wageType || 'monthly'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
    setSelectedCategories(prev => prev.filter(catId => catId !== id));
  };

  const handleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(categories.map(cat => cat.id));
    } else {
      setSelectedCategories([]);
    }
  };

  const applyRatesToSelected = () => {
    setCategories(prev => prev.map(cat => 
      selectedCategories.includes(cat.id)
        ? { ...cat, gstRate, pfRate, esicRate, ratesApplied: true }
        : cat
    ));
    setSelectedCategories([]);
  };

  const calculateTotalCost = (baseWage: number, gst: number, pf: number, esic: number) => {
    const gstAmount = baseWage * gst / 100;
    const pfAmount = baseWage * pf / 100;
    const esicAmount = baseWage * esic / 100;
    return baseWage + gstAmount + pfAmount + esicAmount;
  };

  // Categories with rates applied
  const categoriesWithRates = categories.filter(cat => cat.ratesApplied);

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">GST/ESIC Categories</h1>
            <p className="text-muted-foreground">Manage job categories with GST, PF, and ESIC rates</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Security Guard"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wageType">Wage Type</Label>
                  <Select 
                    value={formData.wageType} 
                    onValueChange={(value: 'monthly' | 'daily') => setFormData({ ...formData, wageType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select wage type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseWage">Base Wage (₹)</Label>
                  <Input
                    id="baseWage"
                    type="number"
                    value={formData.baseWage}
                    onChange={(e) => setFormData({ ...formData, baseWage: Number(e.target.value) })}
                    placeholder={formData.wageType === 'monthly' ? '25000' : '1000'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.wageType === 'monthly' ? 'Monthly salary amount' : 'Daily wage amount'}
                  </p>
                </div>
                
                <Button onClick={handleSubmit} className="w-full" disabled={!formData.title || formData.baseWage <= 0}>
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Two Side-by-Side Containers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Container */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Job Categories</CardTitle>
                  <CardDescription>Select categories to apply rates</CardDescription>
                </div>
                {categories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedCategories.length === categories.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm">Select All</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Base Wage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => handleCategorySelection(category.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{category.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>₹{category.baseWage.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {category.wageType || 'monthly'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category.ratesApplied ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <Check className="h-3 w-3" />
                            Applied
                          </span>
                        ) : (
                          <span className="text-yellow-600 text-sm">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {categories.length === 0 && (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No categories found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first job category to get started
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GST, PF, ESIC Container */}
          <Card>
            <CardHeader>
              <CardTitle>GST, PF, ESIC Rates</CardTitle>
              <CardDescription>Configure rates and apply to selected categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="gst-rate">GST Rate (%)</Label>
                <Input
                  id="gst-rate"
                  type="number"
                  step="0.01"
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Goods and Services Tax percentage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pf-rate">PF Rate (%)</Label>
                <Input
                  id="pf-rate"
                  type="number"
                  step="0.01"
                  value={pfRate}
                  onChange={(e) => setPfRate(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Provident Fund contribution percentage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="esic-rate">ESIC Rate (%)</Label>
                <Input
                  id="esic-rate"
                  type="number"
                  step="0.01"
                  value={esicRate}
                  onChange={(e) => setEsicRate(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Employee State Insurance Corporation percentage
                </p>
              </div>

              {/* Rate Summary */}
              <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
                <h4 className="font-semibold">Current Rates Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span className="font-medium">{gstRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PF:</span>
                    <span className="font-medium">{pfRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ESIC:</span>
                    <span className="font-medium">{esicRate}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total Additional:</span>
                    <span>{(gstRate + pfRate + esicRate).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {selectedCategories.length > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <h4 className="font-semibold mb-2">Selected Categories ({selectedCategories.length})</h4>
                  <div className="text-sm text-muted-foreground mb-3">
                    {categories
                      .filter(cat => selectedCategories.includes(cat.id))
                      .map(cat => cat.title)
                      .join(', ')}
                  </div>
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={applyRatesToSelected}
                disabled={selectedCategories.length === 0}
              >
                <Settings className="h-4 w-4 mr-2" />
                Apply to Selected Categories ({selectedCategories.length})
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Final Detailed Table */}
        {categoriesWithRates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Final Categories with Applied Rates</CardTitle>
              <CardDescription>Complete breakdown of all categories with GST, PF, and ESIC rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Wage Type</TableHead>
                    <TableHead>Base Wage</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>PF </TableHead>
                    <TableHead>ESIC </TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Monthly Equivalent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesWithRates.map((category) => {
                    const gstAmount = category.baseWage * gstRate / 100;
                    const pfAmount = category.baseWage * pfRate / 100;
                    const esicAmount = category.baseWage * esicRate / 100;
                    const totalCost = calculateTotalCost(category.baseWage, gstRate, pfRate, esicRate);
                    const monthlyEquivalent = category.wageType === 'daily' ? totalCost * 30 : totalCost;

                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.title}</TableCell>
                        <TableCell className="capitalize">{category.wageType || 'monthly'}</TableCell>
                        <TableCell>₹{category.baseWage.toLocaleString()}</TableCell>
                        <TableCell>₹{gstAmount.toLocaleString()}</TableCell>
                        <TableCell>₹{pfAmount.toLocaleString()}</TableCell>
                        <TableCell>₹{esicAmount.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">₹{totalCost.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          ₹{monthlyEquivalent.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Summary Row */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Categories</p>
                    <p className="text-2xl font-bold">{categoriesWithRates.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Base Wage</p>
                    <p className="text-2xl font-bold">
                      ₹{categoriesWithRates.length > 0 
                        ? Math.round(categoriesWithRates.reduce((sum, cat) => sum + cat.baseWage, 0) / categoriesWithRates.length).toLocaleString()
                        : '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Total Cost</p>
                    <p className="text-2xl font-bold">
                      ₹{categoriesWithRates.length > 0 
                        ? Math.round(categoriesWithRates.reduce((sum, cat) => 
                            sum + calculateTotalCost(cat.baseWage, gstRate, pfRate, esicRate), 0) / categoriesWithRates.length).toLocaleString()
                        : '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Monthly Cost</p>
                    <p className="text-2xl font-bold">
                      ₹{categoriesWithRates.length > 0 
                        ? Math.round(categoriesWithRates.reduce((sum, cat) => {
                            const totalCost = calculateTotalCost(cat.baseWage, gstRate, pfRate, esicRate);
                            return sum + (cat.wageType === 'daily' ? totalCost * 30 : totalCost);
                          }, 0) / categoriesWithRates.length).toLocaleString()
                        : '0'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
       
      </div>
    </AnimatedPage>
  );
}
