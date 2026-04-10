import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Upload, X, Save, Palette, Image as ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface SplashImage {
  id: string;
  image_url: string;
  title: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface BrandingSettings {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  background_color: string | null;
  logo_url: string | null;
}

export default function StaffCustomization() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<SplashImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    order_index: 0,
    image_url: '',
  });

  // Fetch branding settings
  const { data: branding, isLoading: brandingLoading } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branding_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BrandingSettings | null;
    },
  });

  const [brandingForm, setBrandingForm] = useState({
    primary_color: '#1C6135',
    secondary_color: '#2D7A4A',
    accent_color: '#4CAF50',
    background_color: '#0F3D1F',
    logo_url: '',
  });

  // Update brandingForm when data loads
  useState(() => {
    if (branding) {
      setBrandingForm({
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color || '#4CAF50',
        background_color: branding.background_color || '#0F3D1F',
        logo_url: branding.logo_url || '',
      });
    }
  });

  // Fetch splash images
  const { data: images = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['splash-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('splash_images')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as SplashImage[];
    },
  });

  // Save branding settings
  const brandingMutation = useMutation({
    mutationFn: async (data: typeof brandingForm) => {
      if (branding?.id) {
        const { error } = await supabase
          .from('branding_settings')
          .update({
            primary_color: data.primary_color,
            secondary_color: data.secondary_color,
            accent_color: data.accent_color,
            background_color: data.background_color,
            logo_url: data.logo_url || null,
          })
          .eq('id', branding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branding_settings')
          .insert({
            primary_color: data.primary_color,
            secondary_color: data.secondary_color,
            accent_color: data.accent_color,
            background_color: data.background_color,
            logo_url: data.logo_url || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast({ title: 'Personnalisation enregistrée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' });
    },
  });

  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);
      
      setBrandingForm(prev => ({ ...prev, logo_url: publicUrl }));
      toast({ title: 'Logo uploadé' });
    } catch {
      toast({ title: 'Erreur upload', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Splash image mutations
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('splash-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('splash-images')
        .getPublicUrl(fileName);
      
      return publicUrl;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; order_index: number; image_url: string; id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('splash_images')
          .update({ title: data.title, order_index: data.order_index, image_url: data.image_url })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('splash_images')
          .insert({ title: data.title, order_index: data.order_index, image_url: data.image_url });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splash-images'] });
      setIsDialogOpen(false);
      setEditingImage(null);
      setFormData({ title: '', order_index: 0, image_url: '' });
      toast({ title: editingImage ? 'Image modifiée' : 'Image ajoutée' });
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('splash_images')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splash-images'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('splash_images')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splash-images'] });
      toast({ title: 'Image supprimée' });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadMutation.mutateAsync(file);
      setFormData(prev => ({ ...prev, image_url: url }));
    } catch {
      toast({ title: 'Erreur upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingImage(null);
    setFormData({ title: '', order_index: images.length, image_url: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (image: SplashImage) => {
    setEditingImage(image);
    setFormData({ title: image.title || '', order_index: image.order_index, image_url: image.image_url });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.image_url) {
      toast({ title: 'Veuillez ajouter une image', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...formData, id: editingImage?.id });
  };

  // Sync branding form when data loads
  if (branding && brandingForm.primary_color === '#1C6135' && branding.primary_color !== '#1C6135') {
    setBrandingForm({
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      accent_color: branding.accent_color || '#4CAF50',
      background_color: branding.background_color || '#0F3D1F',
      logo_url: branding.logo_url || '',
    });
  }

  if (brandingLoading || imagesLoading) {
    return <div className="p-4 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible defaultValue="colors" className="w-full">
        {/* Colors & Logo Section */}
        <AccordionItem value="colors">
          <AccordionTrigger className="text-base font-semibold">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Couleurs & Logo
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo de l'application</Label>
                  <div className="flex items-center gap-4">
                    {brandingForm.logo_url ? (
                      <div className="relative">
                        <img 
                          src={brandingForm.logo_url} 
                          alt="Logo" 
                          className="w-16 h-16 rounded-lg object-cover border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => setBrandingForm(prev => ({ ...prev, logo_url: '' }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-16 h-16 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleLogoUpload} 
                          disabled={uploadingLogo} 
                        />
                      </label>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploadingLogo ? 'Upload...' : 'Cliquez pour uploader'}
                    </span>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary">Couleur principale</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandingForm.primary_color}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        id="primary"
                        value={brandingForm.primary_color}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary">Couleur secondaire</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandingForm.secondary_color}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        id="secondary"
                        value={brandingForm.secondary_color}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent">Couleur d'accent</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandingForm.accent_color}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, accent_color: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        id="accent"
                        value={brandingForm.accent_color}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, accent_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="background">Couleur de fond</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandingForm.background_color || '#0F3D1F'}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, background_color: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        id="background"
                        value={brandingForm.background_color || '#0F3D1F'}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, background_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => brandingMutation.mutate(brandingForm)} 
                  className="w-full"
                  disabled={brandingMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {brandingMutation.isPending ? 'Enregistrement...' : 'Enregistrer les couleurs'}
                </Button>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Splash Screen Section */}
        <AccordionItem value="splash">
          <AccordionTrigger className="text-base font-semibold">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Splash Screen
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Les 2 premières images actives tourneront autour du centre.
                </p>
                <Button onClick={openCreateDialog} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {images.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucune image. Ajoutez-en pour personnaliser l'écran de chargement.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {images.map((image) => (
                    <Card key={image.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <img
                          src={image.image_url}
                          alt={image.title || 'Splash'}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{image.title || 'Sans titre'}</p>
                          <p className="text-xs text-muted-foreground">Ordre: {image.order_index}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={image.is_active}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: image.id, is_active: checked })}
                          />
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(image)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(image.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Splash Image Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingImage ? 'Modifier l\'image' : 'Ajouter une image'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formData.image_url ? (
              <div className="relative">
                <img src={formData.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'Upload...' : 'Cliquez pour uploader'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Titre (optionnel)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Logo BDS"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Ordre d'affichage</Label>
              <Input
                id="order"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
