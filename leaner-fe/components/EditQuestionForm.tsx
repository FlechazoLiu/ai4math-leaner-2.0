"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  UpdateQuestionRequest,
  MathDifficulty,
  LeanDifficulty,
  Tag,
  ListTagsRequest,
  Question,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { updateQuestion, listTags } from "@/lib/grpc";
import { createTagAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";

interface EditQuestionFormProps {
  question: Question;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export default function EditQuestionForm({
  question,
  onSuccess,
  trigger,
}: EditQuestionFormProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [informalDescription, setInformalDescription] = useState("");
  const [formalDescription, setFormalDescription] = useState("");
  const [mathDifficulty, setMathDifficulty] = useState<
    MathDifficulty | undefined
  >();
  const [leanDifficulty, setLeanDifficulty] = useState<
    LeanDifficulty | undefined
  >();
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // Tag management
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingTags, setLoadingTags] = useState(false);

  // Check if user can edit questions (admin, teacher, assistant)
  const canEditQuestions =
    session?.user?.role && [1, 2, 3].includes(session.user.role);

  // Initialize form with question data
  useEffect(() => {
    if (question) {
      setTitle(question.title);
      setInformalDescription(question.informalDescription);
      setFormalDescription(question.formalDescription || "");
      setMathDifficulty(question.mathDifficulty);
      setLeanDifficulty(question.leanDifficulty);
      setSelectedTags(question.tags);
    }
  }, [question]);

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open]);

  const loadTags = async () => {
    try {
      setLoadingTags(true);
      const request = {
        pageSize: 100, // Get all tags for now
        pageToken: "1",
      } as ListTagsRequest;

      const response = await listTags(request);
      setAvailableTags(response.tags);
    } catch (error) {
      console.error("Error loading tags:", error);
      toast.error("Failed to load tags");
    } finally {
      setLoadingTags(false);
    }
  };

  const handleAddTag = (tagId: string) => {
    const tagToAdd = availableTags.find((tag) => tag.id === tagId);
    if (tagToAdd && !selectedTags.some((tag) => tag.id === tagId)) {
      setSelectedTags([...selectedTags, tagToAdd]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
  };

  const handleAddNewTag = () => {
    if (!newTagName.trim()) {
      return;
    }

    if (!session?.user?.token) {
      toast.error("Authentication required");
      return;
    }

    // Check if tag already exists locally
    if (selectedTags.some((tag) => tag.name === newTagName.trim())) {
      toast.error("Tag already selected");
      return;
    }

    // Check if tag already exists in available tags
    const existingTag = availableTags.find(
      (tag) => tag.name === newTagName.trim(),
    );
    if (existingTag) {
      setSelectedTags([...selectedTags, existingTag]);
      setNewTagName("");
      return;
    }

    // Create new tag using server action
    createTagAction(newTagName.trim(), session.user.token)
      .then((response) => {
        if (response.tag) {
          // Add to selected tags
          setSelectedTags([...selectedTags, response.tag]);
          // Add to available tags for future use
          setAvailableTags([...availableTags, response.tag]);
          setNewTagName("");
          toast.success("Tag created and added successfully");
        }
      })
      .catch((error) => {
        console.error("Error creating tag:", error);
        toast.error("Failed to create tag");
      });
  };

  const resetForm = () => {
    if (question) {
      setTitle(question.title);
      setInformalDescription(question.informalDescription);
      setFormalDescription(question.formalDescription || "");
      setMathDifficulty(question.mathDifficulty);
      setLeanDifficulty(question.leanDifficulty);
      setSelectedTags(question.tags);
    }
    setNewTagName("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!informalDescription.trim()) {
      toast.error("Informal description is required");
      return;
    }

    if (!mathDifficulty) {
      toast.error("Math difficulty is required");
      return;
    }

    if (!leanDifficulty) {
      toast.error("Lean difficulty is required");
      return;
    }

    if (!session?.user?.token) {
      toast.error("Authentication required");
      return;
    }

    if (!canEditQuestions) {
      toast.error(
        "Permission denied. Only admin, teacher, and assistant can edit questions.",
      );
      return;
    }

    try {
      setUpdating(true);
      const request = {
        id: question.id,
        title: title.trim(),
        informalDescription: informalDescription.trim(),
        formalDescription: formalDescription.trim() || undefined,
        tagIds: selectedTags.map((tag) => tag.id),
        mathDifficulty,
        leanDifficulty,
        userToken: session.user.token,
      } as UpdateQuestionRequest;

      await updateQuestion(request);
      toast.success("Question updated successfully");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question");
    } finally {
      setUpdating(false);
    }
  };

  if (!canEditQuestions) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>EditQuestion</DialogTitle>
          <DialogDescription>
            Update the question with new description, tags, and difficulty levels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter question title"
            />
          </div>

          {/* Informal Description */}
          <div className="space-y-2">
            <Label htmlFor="informal-desc">Informal Description *</Label>
            <p className="text-xs text-muted-foreground">
              Describe the question in natural language. Markdown syntax is supported.
            </p>
            <Textarea
              id="informal-desc"
              value={informalDescription}
              onChange={(e) => setInformalDescription(e.target.value)}
              placeholder="Enter natural language description of the question"
              className="resize-none h-24 overflow-y-auto whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
              style={{
                minHeight: "6rem",
                maxHeight: "6rem",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            />
            {informalDescription && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Preview</Label>
                <div
                  className="border rounded-md p-3 bg-gray-50 max-h-32 overflow-y-auto overflow-x-hidden w-full min-w-0"
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    hyphens: "auto",
                  }}
                >
                  <Markdown
                    content={informalDescription}
                    className="prose-sm prose-gray max-w-none whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Formal Description */}
          <div className="space-y-2">
            <Label htmlFor="formal-desc">Formal Description (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              Provide formal code or additional details.
            </p>
            <Textarea
              id="formal-desc"
              value={formalDescription}
              onChange={(e) => setFormalDescription(e.target.value)}
              placeholder="Enter formal code or additional details"
              className="resize-none h-24 overflow-y-auto whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
              style={{
                minHeight: "6rem",
                maxHeight: "6rem",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            />
          </div>

          {/* Difficulty Levels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Math Difficulty *</Label>
              <Select
                value={mathDifficulty?.toString() || ""}
                onValueChange={(value) =>
                  setMathDifficulty(parseInt(value) as MathDifficulty)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Math Difficulty (required)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MathDifficulty.SIMP.toString()}>
                    Simp
                  </SelectItem>
                  <SelectItem value={MathDifficulty.EASY.toString()}>
                    Easy
                  </SelectItem>
                  <SelectItem value={MathDifficulty.MEDIUM.toString()}>
                    Medium
                  </SelectItem>
                  <SelectItem value={MathDifficulty.HARD.toString()}>
                    Hard
                  </SelectItem>
                  <SelectItem value={MathDifficulty.SORRY.toString()}>
                    Sorry
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lean Difficulty *</Label>
              <Select
                value={leanDifficulty?.toString() || ""}
                onValueChange={(value) =>
                  setLeanDifficulty(parseInt(value) as LeanDifficulty)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Lean Difficulty (required)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LeanDifficulty.SIMP.toString()}>
                    Simp
                  </SelectItem>
                  <SelectItem value={LeanDifficulty.EASY.toString()}>
                    Easy
                  </SelectItem>
                  <SelectItem value={LeanDifficulty.MEDIUM.toString()}>
                    Medium
                  </SelectItem>
                  <SelectItem value={LeanDifficulty.HARD.toString()}>
                    Hard
                  </SelectItem>
                  <SelectItem value={LeanDifficulty.SORRY.toString()}>
                    Sorry
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-2">
            <Label>Tags</Label>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      className="ml-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 pointer-events-auto"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveTag(tag.id);
                      }}
                    >
                      <X className="h-3 w-3 pointer-events-auto" />
                      <span className="sr-only">Remove tag</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add Existing Tags */}
            <div className="space-y-2">
              <Label className="text-sm">Add Existing Tags</Label>
              <Select onValueChange={handleAddTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tag to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags
                    .filter((tag) => !selectedTags.some((t) => t.id === tag.id))
                    .map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add New Tag */}
            <div className="space-y-2">
              <Label className="text-sm">Create New Tag</Label>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter new tag name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddNewTag}
                  disabled={!newTagName.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              updating ||
              !title.trim() ||
              !informalDescription.trim() ||
              !mathDifficulty ||
              !leanDifficulty ||
              !selectedTags.length
            }
          >
            {updating ? "Updating..." : "Update Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
