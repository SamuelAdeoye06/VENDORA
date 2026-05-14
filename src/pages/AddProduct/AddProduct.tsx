import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { supabase } from '../../lib/supabase';
import { Camera, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import './AddProduct.css';

export default function AddProduct() {
  const { categories, addProduct, user } = useShop();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '', price: '', category: '', description: '',
  });

  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Image must be under 5 MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /**
   * Try Supabase Storage first. If the bucket doesn't exist yet,
   * fall back to storing the image as a data-URL (base64) directly
   * in the DB so adding a product never hard-fails on the user.
   *
   * ── To fix the bucket error permanently (one-time setup): ──
   *  1. Supabase dashboard → Storage → New bucket
   *     Name: product-images  |  Public: ON
   *  2. Storage → Policies → New policy on product-images
   *     Allow authenticated INSERT:
   *       create policy "Vendor uploads" on storage.objects
   *       for insert to authenticated
   *       with check (bucket_id = 'product-images');
   */
  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) {
      // Bucket not created yet — fall back to base64 so the product still saves
      console.warn('Storage upload failed, using base64 fallback:', error.message);
      return imagePreview as string; // already set by FileReader
    }

    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!imageFile && !imagePreview) {
      setSubmitError('Please upload a product image.');
      return;
    }
    if (!user) {
      setSubmitError('You must be logged in to add products.');
      return;
    }

    setIsLoading(true);
    try {
      const imageUrl = imageFile ? await uploadImage(imageFile) : (imagePreview as string);

      await addProduct({
        id: '',                    // Supabase generates the real uuid
        vendorId: user.id.toString(), // auth uuid
        vendorName: user.name,
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        category: formData.category,
        image: imageUrl,
        stock: 50,
        rating: 0,
        reviews: 0,
      });

      navigate('/vendor-dashboard');
    } catch (error: any) {
      console.error('Submission failed:', error);
      setSubmitError(error.message || 'Failed to list product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="add-product-page animate-fade-in">
      <button className="back-btn-text" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="form-header">
        <h1>Add New Product</h1>
        <p>Your item will be visible to all students on campus.</p>
      </div>

      <form className="product-form" onSubmit={handleSubmit}>
        {submitError && (
          <div className="form-error-banner">
            <AlertCircle size={18} /><span>{submitError}</span>
          </div>
        )}

        <div className="form-group">
          <label>Product Image</label>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
          <div className="image-upload-placeholder" onClick={handleImageClick}>
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="preview-img" />
                <div className="image-overlay"><Camera size={20} /><span>Change photo</span></div>
              </>
            ) : (
              <><Camera size={32} /><span>Tap to upload photo</span><span className="upload-hint">Max 5 MB · JPG, PNG, WEBP</span></>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="name">Product Name</label>
          <input type="text" id="name" name="name" placeholder="e.g. Vintage Denim Jacket" required value={formData.name} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label htmlFor="price">Price (₦)</label>
          <input type="number" id="price" name="price" placeholder="0.00" required min="0" step="0.01" value={formData.price} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" required value={formData.category} onChange={handleChange}>
            <option value="">Select a category</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={4} placeholder="Tell buyers about your product..." required value={formData.description} onChange={handleChange}></textarea>
        </div>

        <button type="submit" className="submit-btn-full active-bounce" disabled={isLoading}>
          {isLoading ? <><Loader2 size={20} className="animate-spin" /> Publishing...</> : 'List Product →'}
        </button>
      </form>
    </div>
  );
}
