import React, { useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Upload, Trash2, X } from 'lucide-react';

interface Photo {
    id: string;
    url: string;
    caption: string;
    uploadedBy: string;
    uploadedAt: string;
}

const GalleryPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([
        { id: '1', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400', caption: 'Team practice session', uploadedBy: 'Coach Smith', uploadedAt: '2025-12-01' },
        { id: '2', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400', caption: 'Championship game', uploadedBy: 'Sarah Johnson', uploadedAt: '2025-12-02' },
        { id: '3', url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400', caption: 'Team celebration', uploadedBy: 'Mike Davis', uploadedAt: '2025-12-03' },
        { id: '4', url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400', caption: 'Pre-game warmup', uploadedBy: 'Emily Brown', uploadedAt: '2025-12-04' },
        { id: '5', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400', caption: 'Trophy ceremony', uploadedBy: 'Coach Smith', uploadedAt: '2025-12-05' },
        { id: '6', url: 'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=400', caption: 'Team huddle', uploadedBy: 'Sarah Johnson', uploadedAt: '2025-12-06' },
    ]);

    const handleDelete = (id: string) => {
        setPhotos(photos.filter(p => p.id !== id));
        setSelectedPhoto(null);
    };

    const handleUpload = () => {
        // Simulate file upload
        const newPhoto: Photo = {
            id: String(photos.length + 1),
            url: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400',
            caption: 'New team photo',
            uploadedBy: user?.name || 'You',
            uploadedAt: new Date().toISOString().split('T')[0],
        };
        setPhotos([newPhoto, ...photos]);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Team Gallery</h1>
                        <p className="text-gray-600 mt-1">{photos.length} photos</p>
                    </div>
                    <Button onClick={handleUpload} className="flex items-center space-x-2">
                        <Upload className="h-4 w-4" />
                        <span>Upload Photo</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="relative group cursor-pointer"
                            onClick={() => setSelectedPhoto(photo)}
                        >
                            <div className="card overflow-hidden hover:shadow-xl transition-shadow">
                                <img
                                    src={photo.url}
                                    alt={photo.caption}
                                    className="w-full h-64 object-cover"
                                />
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900">{photo.caption}</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        By {photo.uploadedBy} • {photo.uploadedAt}
                                    </p>
                                </div>
                                {isAdmin && (
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(photo.id);
                                            }}
                                            className="flex items-center space-x-1"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {selectedPhoto && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <div className="max-w-4xl w-full mx-4">
                            <div className="relative">
                                <button
                                    onClick={() => setSelectedPhoto(null)}
                                    className="absolute -top-12 right-0 text-white hover:text-gray-300"
                                >
                                    <X className="h-8 w-8" />
                                </button>
                                <img
                                    src={selectedPhoto.url}
                                    alt={selectedPhoto.caption}
                                    className="w-full max-h-[80vh] object-contain"
                                />
                                <div className="bg-white p-4 mt-4 rounded-lg">
                                    <h3 className="text-xl font-semibold text-gray-900">{selectedPhoto.caption}</h3>
                                    <p className="text-gray-600 mt-2">
                                        Uploaded by {selectedPhoto.uploadedBy} on {selectedPhoto.uploadedAt}
                                    </p>
                                    {isAdmin && (
                                        <Button
                                            variant="danger"
                                            onClick={() => handleDelete(selectedPhoto.id)}
                                            className="mt-4 flex items-center space-x-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span>Delete Photo</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default GalleryPage;