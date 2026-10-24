import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, HardHat, ArrowLeft } from "lucide-react";
import VerificationStepper from "@/components/verification/VerificationStepper";
import StepIdentity, { type IdentityData } from "@/components/verification/StepIdentity";
import StepAddress, { type AddressData } from "@/components/verification/StepAddress";

import StepSelfie, { type SelfieData } from "@/components/verification/StepSelfie";
import StepReview from "@/components/verification/StepReview";
import { uploadToPrivateBucket } from "@/lib/storage";

const ArtisanVerification = () => {
  const { user, loading, userRole } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [identity, setIdentity] = useState<IdentityData>({
    nin: "",
    dateOfBirth: "",
    governmentIdType: "",
    governmentIdFrontFile: null,
    governmentIdBackFile: null,
  });

  const [address, setAddress] = useState<AddressData>({
    currentHouse: "",
    currentStreet: "",
    currentLga: "",
    currentState: "",
    currentLandmark: "",
    previousHouse: "",
    previousStreet: "",
    previousLga: "",
    previousState: "",
    previousLandmark: "",
    proofOfAddressFile: null,
  });


  const [selfie, setSelfie] = useState<SelfieData>({
    selfieFile: null,
    workPhotoFile: null,
    shortVideoFile: null,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (userRole !== "artisan") return <Navigate to="/dashboard" replace />;

  const uploadFile = (file: File, path: string): Promise<string | null> =>
    uploadToPrivateBucket("verification-docs", `${user.id}/${path}`, file);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Upload files in parallel
      const uploads = await Promise.all([
        identity.governmentIdFrontFile
          ? uploadFile(identity.governmentIdFrontFile, `id-front-${Date.now()}.jpg`)
          : Promise.resolve(null),
        identity.governmentIdBackFile
          ? uploadFile(identity.governmentIdBackFile, `id-back-${Date.now()}.jpg`)
          : Promise.resolve(null),
        address.proofOfAddressFile
          ? uploadFile(address.proofOfAddressFile, `proof-address-${Date.now()}.jpg`)
          : Promise.resolve(null),
        selfie.selfieFile
          ? uploadFile(selfie.selfieFile, `selfie-${Date.now()}.jpg`)
          : Promise.resolve(null),
        selfie.workPhotoFile
          ? uploadFile(selfie.workPhotoFile, `work-photo-${Date.now()}.jpg`)
          : Promise.resolve(null),
        selfie.shortVideoFile
          ? uploadFile(selfie.shortVideoFile, `intro-video-${Date.now()}.mp4`)
          : Promise.resolve(null),
      ]);

      const [idFrontUrl, idBackUrl, proofUrl, selfieUrl, workPhotoUrl, videoUrl] = uploads;

      const { error } = await supabase
        .from("artisan_profiles")
        .update({
          nin: identity.nin,
          date_of_birth: identity.dateOfBirth,
          government_id_type: identity.governmentIdType,
          government_id_front_url: idFrontUrl,
          government_id_back_url: idBackUrl,
          current_address_house: address.currentHouse || null,
          current_address_street: address.currentStreet,
          current_address_lga: address.currentLga,
          current_address_state: address.currentState,
          current_address_landmark: address.currentLandmark || null,
          previous_address_house: address.previousHouse || null,
          previous_address_street: address.previousStreet || null,
          previous_address_lga: address.previousLga || null,
          previous_address_state: address.previousState || null,
          previous_address_landmark: address.previousLandmark || null,
          proof_of_address_url: proofUrl,
          selfie_url: selfieUrl,
          work_photo_url: workPhotoUrl,
          verification_status: "pending" as const,
        })
        .eq("user_id", user.id);

      if (error) {
        if (error.message.includes("idx_artisan_profiles_nin_unique") || (error.message.includes("duplicate") && error.message.includes("nin"))) {
          toast.error("This NIN is already registered to another account. Each NIN can only be used once.");
          setStep(0);
          return;
        }
        if (error.message.includes("idx_artisan_profiles_gov_id_front_unique") || (error.message.includes("duplicate") && error.message.includes("government_id"))) {
          toast.error("This government ID document has already been submitted by another account.");
          setStep(0);
          return;
        }
        throw error;
      }

      toast.success("Verification submitted! We'll review within 24–48 hours.");
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <div className="px-4 py-8 pt-24">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/dashboard"
            className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <HardHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">Verification</span>
          </div>
        </div>

        <VerificationStepper currentStep={step} />

        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          {step === 0 && (
            <StepIdentity data={identity} onChange={setIdentity} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <StepAddress
              data={address}
              onChange={setAddress}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepSelfie
              data={selfie}
              onChange={setSelfie}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepReview
              identity={identity}
              address={address}
              selfie={selfie}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>
      </div>
      </div>
      </div>
  );
};

export default ArtisanVerification;
