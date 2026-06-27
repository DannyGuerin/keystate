import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function CodeEntrySection() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 4) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid campaign code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .rpc("get_campaign_for_order", { campaign_code: cleanCode });

      if (error) throw error;

      if (!data || data.length === 0 || data[0].status !== "active") {
        toast({
          title: "Invalid Code",
          description: "This campaign code is invalid or no longer active.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      navigate(`/order/${cleanCode}`);
    } catch (error) {
      console.error("Error validating code:", error);
      toast({
        title: "Error",
        description: "Failed to validate code. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <section id="code-entry" className="py-16 md:py-24 bg-gradient-to-t from-[hsl(14,100%,57%)] to-white">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl">Have an Order Code?</CardTitle>
            <CardDescription className="text-base">
              Enter your unique campaign code to view your order form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter campaign code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center text-lg h-12 uppercase"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-base" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "View My Order"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
