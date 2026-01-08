import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import keystateLogoUrl from "@/assets/keystate-logo.png";

export default function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <img
              src={keystateLogoUrl}
              alt="KEYSTATE"
              className="h-8"
            />
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <span className="text-muted-foreground select-none">Contact</span>
            <Link
              to="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
          </nav>
        </div>

        <Separator className="my-6 block md:hidden" />

        <div className="text-center md:text-right text-xs text-muted-foreground md:mt-0">
          <p>&copy; {new Date().getFullYear()} KEYSTATE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
