import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  created_at: string;
}

export default function AdminCoupons() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_percentage: 10,
    is_active: true,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
    max_uses: "",
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (couponData: typeof newCoupon) => {
      const { data, error } = await supabase
        .from("coupons")
        .insert([{
          code: couponData.code.toUpperCase(),
          discount_percentage: couponData.discount_percentage,
          is_active: couponData.is_active,
          valid_from: couponData.valid_from,
          valid_until: couponData.valid_until || null,
          max_uses: couponData.max_uses ? parseInt(couponData.max_uses) : null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({
        title: "Success",
        description: "Coupon created successfully",
      });
      setIsDialogOpen(false);
      setNewCoupon({
        code: "",
        discount_percentage: 10,
        is_active: true,
        valid_from: new Date().toISOString().split("T")[0],
        valid_until: "",
        max_uses: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", couponId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({
        title: "Success",
        description: "Coupon deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Coupon Management</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Coupon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Coupon</DialogTitle>
                <DialogDescription>
                  Add a new discount coupon for your customers
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Coupon Code</Label>
                  <Input
                    id="code"
                    value={newCoupon.code}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })
                    }
                    placeholder="WELCOME10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discount">Discount Percentage</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="1"
                    max="100"
                    value={newCoupon.discount_percentage}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        discount_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valid_from">Valid From</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={newCoupon.valid_from}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, valid_from: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valid_until">Valid Until (Optional)</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={newCoupon.valid_until}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, valid_until: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max_uses">Max Uses (Optional)</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    min="1"
                    value={newCoupon.max_uses}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, max_uses: e.target.value })
                    }
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={newCoupon.is_active}
                    onCheckedChange={(checked) =>
                      setNewCoupon({ ...newCoupon, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createCouponMutation.mutate(newCoupon)}
                  disabled={!newCoupon.code || createCouponMutation.isPending}
                >
                  Create Coupon
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {coupons?.map((coupon) => (
            <Card key={coupon.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl font-mono">{coupon.code}</CardTitle>
                    <Badge variant={coupon.is_active ? "default" : "secondary"}>
                      {coupon.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{coupon.discount_percentage}% OFF</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: coupon.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCouponMutation.mutate(coupon.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valid From</p>
                    <p className="font-medium">
                      {new Date(coupon.valid_from).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valid Until</p>
                    <p className="font-medium">
                      {coupon.valid_until
                        ? new Date(coupon.valid_until).toLocaleDateString()
                        : "No expiry"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Usage</p>
                    <p className="font-medium">
                      {coupon.current_uses}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : " (unlimited)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(coupon.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!coupons?.length && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No coupons created yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "New Coupon" to create your first discount code
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
