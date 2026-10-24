import { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Globe, Gift, Home, Building } from "lucide-react";
import jobmanLogo from "@/assets/jobman-logo.png";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { isValidPostcode, formatPostcode, POSTCODE_PLACEHOLDER } from "@/lib/postcode";

const COUNTRY_CODES = [
  { code: "+234", country: "🇳🇬 Nigeria", short: "NG" },
  { code: "+233", country: "🇬🇭 Ghana", short: "GH" },
  { code: "+254", country: "🇰🇪 Kenya", short: "KE" },
  { code: "+27", country: "🇿🇦 South Africa", short: "ZA" },
  { code: "+44", country: "🇬🇧 United Kingdom", short: "GB" },
  { code: "+1", country: "🇺🇸 United States", short: "US" },
  { code: "+1", country: "🇨🇦 Canada", short: "CA" },
  { code: "+49", country: "🇩🇪 Germany", short: "DE" },
  { code: "+33", country: "🇫🇷 France", short: "FR" },
  { code: "+971", country: "🇦🇪 UAE", short: "AE" },
  { code: "+966", country: "🇸🇦 Saudi Arabia", short: "SA" },
  { code: "+91", country: "🇮🇳 India", short: "IN" },
  { code: "+86", country: "🇨🇳 China", short: "CN" },
];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const TRADES = [
  "Bricklaying & Masonry", "Painting & Finishing", "Electrical Work",
  "Plumbing", "Carpentry", "Welding & Fabrication", "Roofing",
  "Tiling & Flooring", "POP & Screeding", "Aluminium & Glass",
  "Iron Bending", "Contractor", "General Construction",
  "Engineer", "Architect", "Surveyor",
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "bg-destructive" };
  if (score === 2) return { score: 40, label: "Fair", color: "bg-warning" };
  if (score === 3) return { score: 60, label: "Good", color: "bg-warning" };
  if (score === 4) return { score: 80, label: "Strong", color: "bg-primary" };
  return { score: 100, label: "Very Strong", color: "bg-primary" };
}

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "artisan" ? "artisan" : "customer";
  const redirectTo = searchParams.get("redirect");
  const initialRef = searchParams.get("ref") || "";

  const [role, setRole] = useState(initialRole);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("NG");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [lga, setLga] = useState("");
  const [postcode, setPostcode] = useState("");
  const [primaryTrade, setPrimaryTrade] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [referralCode, setReferralCode] = useState(initialRef);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !phone.trim() || !state || !streetName.trim() || !postcode.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isValidPostcode(postcode)) {
      toast.error("Enter a valid postcode, e.g. ED9 1AA");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (role === "artisan" && !primaryTrade) {
      toast.error("Please select your primary trade");
      return;
    }

    const fullAddress = [houseNumber, streetName, landmark, city, lga, state].filter(Boolean).join(", ");

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          role,
          primary_trade: primaryTrade || undefined,
          phone: `${COUNTRY_CODES.find(c => c.short === countryCode)?.code || '+234'}${phone.replace(/^0+/, '')}`,
          state: state,
          lga: lga.trim() || undefined,
          address: fullAddress || undefined,
          postcode: formatPostcode(postcode),
          years_experience: yearsExperience ? parseInt(yearsExperience) : undefined,
          referral_code: referralCode.trim().toUpperCase() || undefined,
        },
      },
    });

    setLoading(false);
    if (error) {
      if (error.message.includes("idx_profiles_phone_unique") || (error.message.includes("duplicate") && error.message.includes("phone"))) {
        toast.error("This phone number is already registered. Please use a different number.");
      } else if (error.message.includes("idx_profiles_email_unique") || (error.message.includes("duplicate") && error.message.includes("email"))) {
        toast.error("This email address is already registered. Please use a different email or sign in.");
      } else if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Account created! Please check your email to verify your account before signing in.", { duration: 8000 });
      navigate(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src={jobmanLogo} alt="Jobman" className="h-16" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">Create your account</h1>
          <p className="text-muted-foreground mt-1">Join Nigeria's trusted artisan marketplace</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {/* Role selector */}
          <div className="flex rounded-xl bg-muted p-1 mb-6">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === "customer"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              I need an Artisan
            </button>
            <button
              type="button"
              onClick={() => setRole("artisan")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                role === "artisan"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              I'm an Artisan
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">A verification email will be sent to confirm your address.</p>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="flex gap-2 mt-1.5">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[130px] shrink-0">
                    <Globe className="w-4 h-4 text-muted-foreground mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((c) => (
                      <SelectItem key={c.short} value={c.short}>
                        {c.country} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="800 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address fields */}
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Home className="w-4 h-4 text-primary" />
                Address
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="houseNumber">House Number</Label>
                  <Input
                    id="houseNumber"
                    placeholder="e.g. 12"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="streetName">Street Name *</Label>
                  <Input
                    id="streetName"
                    placeholder="e.g. Allen Avenue"
                    value={streetName}
                    onChange={(e) => setStreetName(e.target.value)}
                    className="mt-1.5"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  placeholder="e.g. Opposite GTBank"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <div className="relative mt-1.5">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="city"
                      placeholder="e.g. Ikeja"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="lga">LGA</Label>
                  <Input
                    id="lga"
                    placeholder="Local govt area"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>State *</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="mt-1.5">
                      <MapPin className="w-4 h-4 text-muted-foreground mr-2" />
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input
                    id="postcode"
                    placeholder={POSTCODE_PLACEHOLDER}
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase().slice(0, 8))}
                    maxLength={8}
                    className="mt-1.5"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password with strength indicator */}
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Progress value={passwordStrength.score} className="h-1.5 flex-1" />
                    <span className={`text-xs font-medium ${
                      passwordStrength.score <= 40 ? "text-destructive" : 
                      passwordStrength.score <= 60 ? "text-warning" : "text-primary"
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Use uppercase, numbers, and symbols for a stronger password
                  </p>
                </div>
              )}
            </div>

            {role === "artisan" && (
              <>
                <div>
                  <Label>Primary Trade *</Label>
                  <Select value={primaryTrade} onValueChange={setPrimaryTrade}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select your trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="e.g. 5"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 font-semibold mt-2"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            {/* Referral code */}
            <div className="pt-2 border-t border-border">
              <Label htmlFor="referralCode" className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-primary" />
                Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="referralCode"
                placeholder="e.g. A1B2C3D4"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="mt-1.5 font-mono tracking-widest uppercase"
                maxLength={8}
              />
              {referralCode && (
                <p className="text-xs text-primary mt-1">
                  🎁 You were referred! Your friend will earn ₦300 when you complete verification.
                </p>
              )}
            </div>
          </form>

          <SocialLoginButtons />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
