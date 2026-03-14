import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Save, Upload, Loader, Heart } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ProfileImageCropper from "@/components/profile-image-cropper";

const patientProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other", ""]).optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""]).optional(),
  address: z.string().min(1, "Address is required"),
  emergencyContact: z.string().min(10, "Emergency contact must be at least 10 digits"),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
});

type PatientProfileFormData = z.infer<typeof patientProfileSchema>;

interface PatientProfileManagerProps {
  user: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    profilePicture?: string;
    dateOfBirth?: string | Date;
    gender?: string;
    bloodGroup?: string;
    address?: string;
    emergencyContact?: string;
    medicalHistory?: string;
    allergies?: string;
    currentMedications?: string;
  };
}

export default function PatientProfileManager({ user }: PatientProfileManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | undefined>(user.profilePicture);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Watch for user prop changes and update form
  useEffect(() => {
    console.log("🔄 [useEffect] User prop changed:", user?._id);
    
    if (!user?._id) {
      console.log("⚠️ User ID not available yet");
      return;
    }

    const formattedData = {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      dateOfBirth: formatDateForInput(user.dateOfBirth),
      gender: (user.gender || "") as any,
      bloodGroup: (user.bloodGroup || "") as any,
      address: user.address || "",
      emergencyContact: user.emergencyContact || "",
      medicalHistory: user.medicalHistory || "",
      allergies: user.allergies || "",
      currentMedications: user.currentMedications || "",
    };
    
    console.log("📝 Resetting form with formatted data:", {
      firstName: formattedData.firstName,
      lastName: formattedData.lastName,
      dateOfBirth: formattedData.dateOfBirth,
      gender: formattedData.gender,
      bloodGroup: formattedData.bloodGroup,
      address: formattedData.address,
      emergencyContact: formattedData.emergencyContact,
    });
    
    // Reset the form - this updates react-hook-form's internal state
    form.reset(formattedData);
  }, [user?._id, user?.firstName, user?.lastName, user?.email, user?.phone, user?.dateOfBirth, user?.gender, user?.bloodGroup, user?.address, user?.emergencyContact]);

  // Helper function to format date for input[type="date"]
  const formatDateForInput = (dateValue: string | Date | undefined): string => {
    if (!dateValue) return "";
    
    try {
      if (typeof dateValue === 'string') {
        // If it's already a string, check if it's in YYYY-MM-DD format
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
          return dateValue.split('T')[0];
        }
        // Otherwise try to parse it
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } else if (dateValue instanceof Date) {
        if (!isNaN(dateValue.getTime())) {
          return dateValue.toISOString().split('T')[0];
        }
      }
    } catch (error) {
      console.error("Error formatting date:", error);
    }
    return "";
  };

  const form = useForm<PatientProfileFormData>({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      dateOfBirth: formatDateForInput(user.dateOfBirth),
      gender: (user.gender || "") as any,
      bloodGroup: (user.bloodGroup || "") as any,
      address: user.address || "",
      emergencyContact: user.emergencyContact || "",
      medicalHistory: user.medicalHistory || "",
      allergies: user.allergies || "",
      currentMedications: user.currentMedications || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: PatientProfileFormData) => {
      const res = await apiRequest("PUT", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: (updatedUserObject) => {
      console.log("✅ Update successful, received:", updatedUserObject);
      
      // Format the date before resetting
      const formattedData = {
        ...updatedUserObject,
        dateOfBirth: formatDateForInput(updatedUserObject.dateOfBirth),
        gender: updatedUserObject.gender || "",
        bloodGroup: updatedUserObject.bloodGroup || "",
      };
      
      console.log("📝 Formatted data for form:", formattedData);
      form.reset(formattedData);
      setFormKey(prev => prev + 1);  // Force re-render
      
      // Invalidate and refetch user query
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      console.error("❌ Update error:", error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PatientProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleImageUpload = async (file: Blob) => {
    setIsUploadingImage(true);
    setCropperOpen(false);

    try {
      const formData = new FormData();
      formData.append("image", file, "profile-image.jpg");

      const response = await fetch("/api/upload/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.profilePicture) {
        const pictureUrl = data.profilePicture.startsWith('http')
          ? data.profilePicture
          : `${window.location.origin}${data.profilePicture}`;

        queryClient.invalidateQueries({ queryKey: ["/api/user"] });

        const cacheBusterUrl = `${pictureUrl}?t=${Date.now()}`;
        setProfilePicture(cacheBusterUrl);

        toast({
          title: "Success",
          description: "Profile picture updated successfully.",
        });
      } else {
        throw new Error("No profile picture URL in server response.");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6" key={formKey}>
      <form onSubmit={form.handleSubmit((data: any) => onSubmit(data as PatientProfileFormData))}>
        {/* Profile Picture & Edit Button */}
        <div className="flex items-center gap-6 mb-2">
          <div>
            <Avatar className="h-28 w-28">
              {profilePicture ? (
                <AvatarImage src={profilePicture} alt="Profile" />
              ) : (
                <AvatarFallback className="text-xl">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={(e) => {
                e.preventDefault();
                setCropperOpen(true);
              }}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <>
                  <Loader className="w-4 h-4 mr-1 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1" /> Upload Photo
                </>
              )}
            </Button>
          </div>
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            className="ml-auto"
            data-testid="edit-profile-btn"
            disabled={isEditing}
          >
            <User className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
        </div>

        <ProfileImageCropper
          open={cropperOpen}
          onClose={() => setCropperOpen(false)}
          onCropComplete={(file) => handleImageUpload(file)}
        />

        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  disabled={!isEditing}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register("lastName")}
                  disabled={!isEditing}
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.lastName.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  disabled={!isEditing}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register("phone")}
                  disabled={!isEditing}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...form.register("dateOfBirth")}
                  disabled={!isEditing}
                />
                {form.formState.errors.dateOfBirth && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.dateOfBirth.message}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={form.watch("gender") || ""}
                  onValueChange={(value) => form.setValue("gender", value as any)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.gender && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.gender.message}</p>
                )}
              </div>

              {/* Blood Group */}
              <div>
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select
                  value={form.watch("bloodGroup") || ""}
                  onValueChange={(value) => form.setValue("bloodGroup", value as any)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.bloodGroup && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.bloodGroup.message}</p>
                )}
              </div>

              {/* Emergency Contact */}
              <div>
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  type="tel"
                  {...form.register("emergencyContact")}
                  disabled={!isEditing}
                />
                {form.formState.errors.emergencyContact && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.emergencyContact.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                {...form.register("address")}
                disabled={!isEditing}
                rows={3}
              />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.address.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="medicalHistory">Medical History</Label>
              <Textarea
                id="medicalHistory"
                placeholder="Any previous medical conditions, surgeries, or treatments..."
                {...form.register("medicalHistory")}
                disabled={!isEditing}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                placeholder="List any known allergies (medications, food, environmental)..."
                {...form.register("allergies")}
                disabled={!isEditing}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="currentMedications">Current Medications</Label>
              <Textarea
                id="currentMedications"
                placeholder="List any medications you are currently taking..."
                {...form.register("currentMedications")}
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setIsEditing(true)}>
              <User className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}