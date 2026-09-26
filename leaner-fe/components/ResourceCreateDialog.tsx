"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createResource, updateResource } from "@/lib/grpc";
import type {
  CreateResourceRequest,
  UpdateResourceRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import type { DisplayResource } from "@/lib/resource-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ResourceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // called after successful create/update
  editingResource: DisplayResource | null;
  userToken: string;
}

export default function ResourceCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  editingResource,
  userToken,
}: ResourceCreateDialogProps) {
  const isEditing = editingResource !== null;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate form when editing
  useEffect(() => {
    if (editingResource) {
      setFormData({
        title: editingResource.title,
        description: editingResource.description,
        url: editingResource.url,
      });
    } else {
      setFormData({ title: "", description: "", url: "" });
    }
  }, [editingResource, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error("Please enter a resource title");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please enter a resource description");
      return;
    }
    if (!formData.url.trim()) {
      toast.error("Please enter a resource URL");
      return;
    }
    try {
      new URL(formData.url);
    } catch {
      toast.error("Please enter a valid URL (starting with http:// or https://)");
      return;
    }

    if (!userToken) {
      toast.error("Authentication expired, please sign in again");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editingResource) {
        await updateResource({
          resourceId: editingResource.id,
          userToken,
          title: formData.title.trim(),
          description: formData.description.trim(),
          url: formData.url.trim(),
        } as UpdateResourceRequest);
        toast.success("Resource updated");
      } else {
        await createResource({
          title: formData.title.trim(),
          description: formData.description.trim(),
          url: formData.url.trim(),
          userToken,
        } as CreateResourceRequest);
        toast.success("Resource created");
      }

      // Reset and close
      setFormData({ title: "", description: "", url: "" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Action failed, please try again";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ title: "", description: "", url: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Resource" : "Create New Resource"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the learning resource information."
              : "Add a new learning resource link. Title, Description, and URL are all required."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resource-title">Title</Label>
            <Input
              id="resource-title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="e.g. Lean 4 Official Tutorial"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-description">Description</Label>
            <Textarea
              id="resource-description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Briefly describe the resource content and target audience"
              rows={3}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-url">URL</Label>
            <Input
              id="resource-url"
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange("url", e.target.value)}
              placeholder="https://example.com"
              required
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Resource"
                  : "Create Resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
