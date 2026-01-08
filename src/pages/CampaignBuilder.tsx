import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, X, Upload, ExternalLink, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getPublicBaseUrl } from "@/lib/publicUrl";

interface KeyringVariant {
  id?: string;
  type: string;
  color: string;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
}

const CampaignBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPostcode, setCompanyPostcode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "paused" | "completed">("draft");
  const [notes, setNotes] = useState("");
  const [variants, setVariants] = useState<KeyringVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const campaignUrl = `${getPublicBaseUrl()}/order/${uniqueCode}`;

  useEffect(() => {
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const fetchCampaign = async () => {
    if (!id) return;

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (campaignError) {
      toast({
        title: "Error",
        description: "Failed to fetch campaign",
        variant: "destructive",
      });
      return;
    }

    setCompanyName(campaign.company_name);
    setCompanyAddress(campaign.company_address || "");
    setCompanyPostcode(campaign.company_postcode || "");
    setContactPerson(campaign.contact_person || "");
    // @ts-ignore
    setContactEmail(campaign.contact_email || "");
    // @ts-ignore
    setContactPhone(campaign.contact_phone || "");
    setUniqueCode(campaign.unique_code);
    setStatus(campaign.status);
    setNotes(campaign.notes || "");
    setLogoUrl(campaign.logo_url || null);

    const { data: variantsData } = await supabase
      .from("keyring_variants")
      .select("*")
      .eq("campaign_id", id)
      .order("sort_order");

    if (variantsData) {
      setVariants(variantsData);
    }
  };

  const generateCode = () => {
    const code = (companyName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 3) + new Date().getFullYear());
    setUniqueCode(code);
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        type: "",
        color: "",
        image_url: null,
        is_available: true,
        sort_order: variants.length,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof KeyringVariant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const uploadImage = async (index: number, file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { error: uploadError, data } = await supabase.storage
      .from("keyring-images")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("keyring-images")
      .getPublicUrl(fileName);

    updateVariant(index, "image_url", publicUrl);
  };

  const uploadLogo = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `logo-${Math.random()}.${fileExt}`;
    const { error: uploadError, data } = await supabase.storage
      .from("campaign-logos")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("campaign-logos")
      .getPublicUrl(fileName);

    setLogoUrl(publicUrl);
  };

  const saveCampaign = async () => {
    if (!companyName || !uniqueCode || variants.length === 0) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields and add at least one variant",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const campaignData = {
      company_name: companyName,
      company_address: companyAddress,
      company_postcode: companyPostcode,
      contact_person: contactPerson,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      unique_code: uniqueCode,
      status,
      notes,
      created_by: user?.id,
      logo_url: logoUrl,
    };

    let campaignId = id;

    if (id) {
      const { error } = await supabase
        .from("campaigns")
        .update(campaignData)
        .eq("id", id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("campaigns")
        .insert(campaignData)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      campaignId = data.id;
    }

    // Delete existing variants if editing
    if (id) {
      await supabase.from("keyring_variants").delete().eq("campaign_id", id);
    }

    // Insert new variants
    const variantsData = variants.map((v, index) => ({
      campaign_id: campaignId,
      type: v.type,
      color: v.color,
      image_url: v.image_url,
      is_available: v.is_available,
      sort_order: index,
    }));

    const { error: variantsError } = await supabase
      .from("keyring_variants")
      .insert(variantsData);

    if (variantsError) {
      toast({
        title: "Error",
        description: variantsError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Campaign saved successfully",
    });

    setLoading(false);
    setShowQR(true);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/campaigns")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-heading font-bold">
              {id ? "Edit Campaign" : "Create Campaign"}
            </h1>
          </div>
          <Button onClick={saveCampaign} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Campaign"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>Enter the estate agent's information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Smith & Sons Estate Agents"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={companyPostcode}
                  onChange={(e) => setCompanyPostcode(e.target.value)}
                  placeholder="SW1A 1AA"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Person</Label>
              <Input
                id="contact"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+44 7XXX XXXXXX"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo (Optional)</Label>
              <div className="flex gap-3 items-center">
                <Input
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadLogo(file);
                  }}
                />
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Company logo"
                    className="h-16 w-auto object-contain rounded border p-1"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This logo will appear at the top of the order form for customers
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unique Campaign Code</CardTitle>
            <CardDescription>This will be used in the URL and QR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={uniqueCode}
                onChange={(e) => setUniqueCode(e.target.value.toUpperCase())}
                placeholder="SMITH2024"
              />
              <Button onClick={generateCode} variant="outline">
                Generate
              </Button>
            </div>
            {uniqueCode && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-mono">{campaignUrl}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keyring Variants</CardTitle>
            <CardDescription>Add the keyring samples you'll send in the mailshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.map((variant, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Variant {index + 1}</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeVariant(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input
                      value={variant.type}
                      onChange={(e) => updateVariant(index, "type", e.target.value)}
                      placeholder="Classic Round"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Input
                      value={variant.color}
                      onChange={(e) => updateVariant(index, "color", e.target.value)}
                      placeholder="Silver"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Photo</Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(index, file);
                      }}
                    />
                    {variant.image_url && (
                      <img
                        src={variant.image_url}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addVariant} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this campaign..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {showQR && uniqueCode && (
          <Card>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
              <CardDescription>Download and include in your mailshot</CardDescription>
            </CardHeader>
            <div className="flex flex-col items-center gap-4">
              {status !== "active" && (
                <div className="w-full p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-md mb-2">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Set status to "Active" to make this link publicly accessible
                  </p>
                </div>
              )}

              {/* Sticker Preview Area */}
              <div
                id="sticker-preview"
                className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 w-[300px] h-[300px]"
              >
                <QRCodeSVG id="campaign-qr-code" value={campaignUrl} size={180} />
                <div className="text-center mt-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Scan to Order</p>
                  <p className="text-xl font-bold font-mono text-black mt-1">Code: {uniqueCode}</p>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-md w-full text-center">
                <p className="text-sm font-mono break-all">{campaignUrl}</p>
              </div>

              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(campaignUrl);
                    toast({
                      title: "Link copied",
                      description: "Campaign link copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(campaignUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Link
                </Button>
                <Button
                  onClick={() => {
                    // Logic to download the sticker div as an image
                    // This is a simplified client-side implementation
                    // Ideally we'd use html2canvas, but here we can reconstruct it on a canvas
                    const svg = document.getElementById("campaign-qr-code");
                    if (!svg) return;

                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const img = new Image();

                    // Sticker dimensions (approx 300x300 at high DPI)
                    const width = 600;
                    const height = 600;
                    canvas.width = width;
                    canvas.height = height;

                    if (ctx) {
                      // White background
                      ctx.fillStyle = "#FFFFFF";
                      ctx.fillRect(0, 0, width, height);

                      // Draw QR Code
                      img.onload = () => {
                        // Centered QR
                        const qrSize = 400;
                        const x = (width - qrSize) / 2;
                        const y = 80; // Top padding
                        ctx.drawImage(img, x, y, qrSize, qrSize);

                        // Draw Text
                        ctx.fillStyle = "#000000";
                        ctx.textAlign = "center";

                        // "Scan to Order"
                        ctx.font = "bold 24px sans-serif";
                        ctx.fillStyle = "#666666";
                        ctx.fillText("SCAN TO ORDER", width / 2, 40); // Top text

                        // "Code: XXXX"
                        ctx.font = "bold 48px monospace";
                        ctx.fillStyle = "#000000";
                        ctx.fillText(`Code: ${uniqueCode}`, width / 2, height - 60);

                        // Download
                        const pngFile = canvas.toDataURL("image/png");
                        const downloadLink = document.createElement("a");
                        downloadLink.download = `${uniqueCode}-sticker.png`;
                        downloadLink.href = pngFile;
                        downloadLink.click();
                      };
                      img.src = "data:image/svg+xml;base64," + btoa(svgData);
                    }
                  }}
                >
                  Download Sticker Asset
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CampaignBuilder;
