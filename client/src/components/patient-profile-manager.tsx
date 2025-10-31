import { useState } from "react";
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
import { User, Save, Phone, Mail, MapPin, Heart, AlertTriangle, Upload } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ProfileImageCropper from "@/components/profile-image-cropper";

const patientProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  address: z.string().min(1, "Address is required"),
  emergencyContact: z.string().min(10, "Emergency contact must be at least 10 digits"),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
});

type PatientProfileFormData = z.infer<typeof patientProfileSchema>;


interface PatientProfileManagerProps {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    profilePicture?: string;
  };
}

export default function PatientProfileManager({ user }: PatientProfileManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | undefined>(user.profilePicture);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PatientProfileFormData>({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      dateOfBirth: "",
      gender: "",
      bloodGroup: "",
      address: "",
      emergencyContact: "",
      medicalHistory: "",
      allergies: "",
      currentMedications: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: PatientProfileFormData) => {
      const res = await apiRequest("PUT", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
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

  return (
    <div className="space-y-6">
      {/* Profile Picture & Edit Button */}
      <div className="flex items-center gap-6 mb-2">
        <div>
          <Avatar className="h-20 w-20">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt="Profile" />
            ) : (
              <AvatarFallback>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            )}
          </Avatar>
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setCropperOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Upload Photo
          </Button>
        </div>
        <Button onClick={() => setIsEditing(true)} className="ml-auto" data-testid="edit-profile-btn">
          <User className="w-4 h-4 mr-2" /> Edit Profile
        </Button>
      </div>
      <ProfileImageCropper
        open={cropperOpen}
        onClose={() => setCropperOpen(false)}
        onCropComplete={async (file, crop, nudge) => {
          // Upload to backend
          const formData = new FormData();
          formData.append("image", file);
          formData.append("crop", JSON.stringify(crop));
          formData.append("nudge", JSON.stringify(nudge));
          const res = await fetch("/api/upload/profile-picture", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.profilePicture) setProfilePicture(data.profilePicture);
        }}
      />
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...form.register("firstName")}
                disabled={!isEditing}
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...form.register("lastName")}
                disabled={!isEditing}
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                disabled={!isEditing}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                {...form.register("phone")}
                disabled={!isEditing}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...form.register("dateOfBirth")}
                disabled={!isEditing}
              />
              {form.formState.errors.dateOfBirth && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.dateOfBirth.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={form.watch("gender")}
                onValueChange={(value) => form.setValue("gender", value as any)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select
                value={form.watch("bloodGroup")}
                onValueChange={(value) => form.setValue("bloodGroup", value as any)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
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
            </div>

            <div>
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                type="tel"
                {...form.register("emergencyContact")}
                disabled={!isEditing}
              />
              {form.formState.errors.emergencyContact && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.emergencyContact.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...form.register("address")}
              disabled={!isEditing}
              rows={3}
            />
            {form.formState.errors.address && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.address.message}
              </p>
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
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateProfileMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <User className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
