import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import keystateLogoUrl from "@/assets/keystate-logo.png";

export default function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img 
              src={keystateLogoUrl} 
              alt="KEYSTATE" 
              className="h-10 mb-4"
            />
            <p className="text-muted-foreground">
              Premium branded keyrings for businesses
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <nav className="space-y-2">
              <Link 
                to="/login" 
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin Login
              </Link>
            </nav>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <p className="text-muted-foreground">
              Get in touch using the form above
            </p>
          </div>
        </div>
        
        <Separator className="my-8" />
        
        <div className="text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} KEYSTATE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
