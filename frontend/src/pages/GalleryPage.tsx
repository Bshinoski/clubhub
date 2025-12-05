import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import api, { Photo } from '../api/api-client';
import { Upload, X, Trash2, Edit2, Camera, AlertCircle } from 'lucide-react';

const GalleryPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState<Photo | null>(null);
    const [showEditModal, setShowEditModal] = useState<Photo | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadCaption, setUploadCaption] = useState('');
    const [editCaption, setEditCaption] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchPhotos();
        fetchPhotoCount();
    }, []);

    const fetchPhotos = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.photos.getAll({ limit: 50 });
            setPhotos(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load photos');
        } finally {
            setLoading(false);
        }
    };

    const fetchPhotoCount = async () => {
        try {
            const data = await api.photos.getCount();
            setTotalCount(data.count);
        } catch (err) {
            console.error('Failed to fetch photo count:', err);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            await api.photos.upload(selectedFile, uploadCaption);

            // Refresh photos
            await fetchPhotos();
            await fetchPhotoCount();

            // Reset form
            setShowUploadModal(false);
            setSelectedFile(null);
            setUploadCaption('');
            setPreviewUrl(null);
        } catch (err: any) {
            alert(err.message || 'Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const openEditModal = (photo: Photo) => {
        setShowEditModal(photo);
        setEditCaption(photo.caption || '');
    };

    const handleUpdateCaption = async () => {
        if (!showEditModal) return;

        try {
            await api.photos.updateCaption(showEditModal.photo_id, editCaption);

            // Refresh photos
            await fetchPhotos();
            setShowEditModal(null);
            setEditCaption('');
        } catch (err: any) {
            alert(err.message || 'Failed to update caption');
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        try {
            await api.photos.delete(photoId);

            // Refresh photos
            await fetchPhotos();
            await fetchPhotoCount();
            setShowDeleteConfirm(null);
            setShowViewModal(null);
        } catch (err: any) {
            alert(err.message || 'Failed to delete photo');
        }
    };

    const canEdit = (photo: Photo) => {
        return isAdmin || photo.uploaded_by === user?.id;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading gallery...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Photo Gallery</h1>
                        <p className="text-gray-600 mt-1">{totalCount} photos</p>
                    </div>
                    <Button onClick={() => setShowUploadModal(true)} className="flex items-center space-x-2">
                        <Upload className="h-4 w-4" />
                        <span>Upload Photo</span>
                    </Button>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Photo Grid */}
                {photos.length === 0 ? (
                    <div className="card text-center py-16">
                        <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No photos yet</h3>
                        <p className="text-gray-600 mb-6">Upload your first team photo to get started</p>
                        <Button onClick={() => setShowUploadModal(true)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Photo
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                            <div
                                key={photo.photo_id}
                                className="card p-0 overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow"
                                onClick={() => setShowViewModal(photo)}
                            >
                                <div className="aspect-square relative overflow-hidden bg-gray-100">
                                    <img
                                        src={photo.url}
                                        alt={photo.caption || 'Team photo'}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e5e7eb" width="400" height="400"/%3E%3Ctext fill="%236b7280" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-end p-3">
                                        <p className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                            {photo.caption || 'No caption'}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-gray-600 truncate">
                                        By {photo.uploader_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(photo.uploaded_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Modal */}
                {showUploadModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-lg w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Upload Photo</h2>
                                <button
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        setSelectedFile(null);
                                        setUploadCaption('');
                                        setPreviewUrl(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {!selectedFile ? (
                                <label className="block cursor-pointer">
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary-500 transition-colors">
                                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-700 font-medium mb-1">Click to upload</p>
                                        <p className="text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </label>
                            ) : (
                                <>
                                    {previewUrl && (
                                        <div className="mb-4">
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                className="w-full h-64 object-cover rounded-lg"
                                            />
                                        </div>
                                    )}

                                    <Input
                                        label="Caption (optional)"
                                        value={uploadCaption}
                                        onChange={(e) => setUploadCaption(e.target.value)}
                                        placeholder="Add a caption..."
                                    />

                                    <div className="flex space-x-3">
                                        <Button
                                            variant="secondary"
                                            fullWidth
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setPreviewUrl(null);
                                            }}
                                        >
                                            Change Photo
                                        </Button>
                                        <Button fullWidth onClick={handleUpload} disabled={uploading}>
                                            {uploading ? 'Uploading...' : 'Upload'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* View Photo Modal */}
                {showViewModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
                        <div className="max-w-4xl w-full">
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-white">
                                    <p className="font-semibold">{showViewModal.uploader_name}</p>
                                    <p className="text-sm opacity-75">
                                        {new Date(showViewModal.uploaded_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowViewModal(null)}
                                    className="text-white hover:text-gray-300"
                                >
                                    <X className="h-8 w-8" />
                                </button>
                            </div>

                            <img
                                src={showViewModal.url}
                                alt={showViewModal.caption || 'Team photo'}
                                className="w-full max-h-[70vh] object-contain rounded-lg mb-4"
                            />

                            {showViewModal.caption && (
                                <p className="text-white text-center mb-4">{showViewModal.caption}</p>
                            )}

                            {canEdit(showViewModal) && (
                                <div className="flex justify-center space-x-3">
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            openEditModal(showViewModal);
                                            setShowViewModal(null);
                                        }}
                                        className="flex items-center space-x-2"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        <span>Edit Caption</span>
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => setShowDeleteConfirm(showViewModal.photo_id)}
                                        className="flex items-center space-x-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Edit Caption Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Edit Caption</h2>
                                <button
                                    onClick={() => setShowEditModal(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <Input
                                label="Caption"
                                value={editCaption}
                                onChange={(e) => setEditCaption(e.target.value)}
                                placeholder="Add a caption..."
                            />

                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowEditModal(null)}>
                                    Cancel
                                </Button>
                                <Button fullWidth onClick={handleUpdateCaption}>
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-sm w-full">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Photo</h2>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this photo? This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    fullWidth
                                    onClick={() => handleDeletePhoto(showDeleteConfirm)}
                                >
                                    Delete Photo
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default GalleryPage;