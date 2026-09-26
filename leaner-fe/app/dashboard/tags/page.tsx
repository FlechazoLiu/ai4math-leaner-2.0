"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Tag,
  ListTagsRequest,
  CreateTagRequest,
  DeleteTagRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { listTags, createTag, deleteTag } from "@/lib/grpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, Filter, Edit, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function TagsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Filter and pagination state - initialized from URL
  const [nameFilter, setNameFilter] = useState(
    () => searchParams.get("name") || "",
  );
  const [debouncedNameFilter, setDebouncedNameFilter] = useState(
    () => searchParams.get("name") || "",
  );
  const [pageSize, setPageSize] = useState(() =>
    parseInt(searchParams.get("pageSize") || "10"),
  );
  const [currentPage, setCurrentPage] = useState(() =>
    parseInt(searchParams.get("page") || "1"),
  );
  const [totalCount, setTotalCount] = useState(0);

  // Check if user can modify tags (admin, teacher, assistant)
  const canModifyTags =
    session?.user?.role && [1, 2, 3].includes(session.user.role);

  // Update URL when filters change
  const updateURL = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === 0) {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Debounce name filter and update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameFilter(nameFilter);
      setCurrentPage(1);
      updateURL({ name: nameFilter, page: 1 });
    }, 500);

    return () => clearTimeout(timer);
  }, [nameFilter]);

  useEffect(() => {
    loadTags();
  }, [debouncedNameFilter, pageSize, currentPage]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const request = {
        pageSize,
        pageToken: currentPage.toString(),
      } as ListTagsRequest;

      // Add name filter if provided
      if (debouncedNameFilter.trim()) {
        request.nameFilter = debouncedNameFilter.trim();
      }

      const response = await listTags(request);
      setTags(response.tags);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error("Error loading tags:", error);
      toast.error("Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name cannot be empty");
      return;
    }

    if (!session?.user?.token) {
      toast.error("Authentication required");
      return;
    }

    if (!canModifyTags) {
      toast.error(
        "Permission denied. Only admin, teacher, and assistant can create tags.",
      );
      return;
    }

    try {
      setCreating(true);
      const request = {
        name: newTagName.trim(),
        userToken: session.user.token,
      } as CreateTagRequest;

      await createTag(request);
      toast.success("Tag created successfully");
      setNewTagName("");
      setCreateDialogOpen(false);
      loadTags();
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("Failed to create tag");
    } finally {
      setCreating(false);
    }
  };

  const handleEditTag = (tag: Tag) => {
    if (!canModifyTags) {
      toast.error(
        "Permission denied. Only admin, teacher, and assistant can modify tags.",
      );
      return;
    }

    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditDialogOpen(true);
  };

  const handleUpdateTag = async () => {
    if (!editTagName.trim()) {
      toast.error("Tag name cannot be empty");
      return;
    }

    if (!session?.user?.token || !editingTag) {
      toast.error("Authentication required");
      return;
    }

    if (!canModifyTags) {
      toast.error(
        "Permission denied. Only admin, teacher, and assistant can modify tags.",
      );
      return;
    }

    try {
      setUpdating(true);

      // Since there's no update endpoint in the proto, we'll need to delete and recreate
      // First delete the old tag
      await deleteTag({
        id: editingTag.id,
        userToken: session.user.token,
      } as DeleteTagRequest);

      // Then create a new tag with the updated name
      await createTag({
        name: editTagName.trim(),
        userToken: session.user.token,
      } as CreateTagRequest);

      toast.success("Tag updated successfully");
      setEditTagName("");
      setEditingTag(null);
      setEditDialogOpen(false);
      loadTags();
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error("Failed to update tag");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!session?.user?.token) {
      toast.error("Authentication required");
      return;
    }

    if (!canModifyTags) {
      toast.error(
        "Permission denied. Only admin, teacher, and assistant can delete tags.",
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete the tag "${tagName}"?`)) {
      return;
    }

    try {
      const request = {
        id: tagId,
        userToken: session.user.token,
      } as DeleteTagRequest;

      await deleteTag(request);
      toast.success("Tag deleted successfully");
      loadTags();
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error("Failed to delete tag");
    }
  };

  const handleNameFilterChange = (value: string) => {
    setNameFilter(value);
  };

  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value);
    if (newPageSize > 0 && newPageSize <= 100) {
      setPageSize(newPageSize);
      setCurrentPage(1);
      updateURL({ pageSize: newPageSize, page: 1 });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateURL({ page: newPage });
  };

  const clearFilters = () => {
    setNameFilter("");
    setDebouncedNameFilter("");
    setPageSize(10);
    setCurrentPage(1);
    router.replace("/dashboard/tags", { scroll: false });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && tags.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading tags...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tag Management</h1>
          {!canModifyTags && (
            <p className="text-sm text-muted-foreground mt-1">
              You can view all tags. Only admins, teachers, and assistants can create, modify, or delete tags.
            </p>
          )}
        </div>
        {canModifyTags && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
                <DialogDescription>
                  Add a new tag that can be used to categorize questions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter tag name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateTag();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={creating || !newTagName.trim()}
                >
                  {creating ? "Creating..." : "Create Tag"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Tag Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update the tag name. This will affect all questions using this tag.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editTagName}
                onChange={(e) => setEditTagName(e.target.value)}
                className="col-span-3"
                placeholder="Enter tag name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateTag();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingTag(null);
                setEditTagName("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateTag}
              disabled={updating || !editTagName.trim()}
            >
              {updating ? "Updating..." : "Update Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name-filter">Filter by name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name-filter"
                  placeholder="Enter tag name prefix..."
                  value={nameFilter}
                  onChange={(e) => handleNameFilterChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-size">Page size</Label>
              <Input
                id="page-size"
                type="number"
                min="1"
                max="100"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="w-20"
              />
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Tags ({totalCount} total)
            {nameFilter && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - Filter &quot;{nameFilter}&quot;
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading tags...
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {nameFilter
                ? `No tags found matching "${nameFilter}". Try adjusting your filters.`
                : "No tags found."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-base font-bold">Name</TableHead>
                    <TableHead className="text-right text-base font-bold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/dashboard/exercises?tag=${encodeURIComponent(tag.name)}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Exercises
                            </Link>
                          </Button>
                          {canModifyTags && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTag(tag)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDeleteTag(tag.id, tag.name)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, totalCount)} of{" "}
                    {totalCount} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePageChange(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage}  of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
