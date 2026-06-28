"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Target, Plus, Trash2 } from "lucide-react";
import { createCategory, deleteCategory } from "@/lib/actions";
import Swal from "sweetalert2";

export function CategoryManager({ categories, onUpdate }: { categories: any[], onUpdate: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("expense");

  const handleAddCategory = async () => {
    if (!newName) return;
    setLoadingId('new');

    try {
      const res = await createCategory({
        name: newName,
        type: newType,
        icon: newType === 'expense' ? '💸' : '💰'
      });

      if (res?.error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: res.error,
          background: '#18181b',
          color: '#fff',
          confirmButtonColor: '#10b981'
        });
        return;
      }

      setNewName("");
      onUpdate();
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Kategori berhasil ditambahkan!',
        background: '#18181b',
        color: '#fff',
        confirmButtonColor: '#10b981',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: "Gagal menambahkan kategori: " + error.message,
        background: '#18181b',
        color: '#fff',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Kategori?',
      text: "Anda yakin ingin menghapus kategori ini?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3f3f46',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      background: '#18181b',
      color: '#fff'
    });

    if (!result.isConfirmed) return;
    
    setLoadingId(id);
    try {
      const res = await deleteCategory(id);
      
      if (res?.error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: res.error,
          background: '#18181b',
          color: '#fff',
          confirmButtonColor: '#10b981'
        });
        return;
      }
      
      onUpdate();
      
      Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Kategori berhasil dihapus.',
        background: '#18181b',
        color: '#fff',
        confirmButtonColor: '#10b981',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: "Gagal menghapus kategori: " + error.message,
        background: '#18181b',
        color: '#fff',
        confirmButtonColor: '#10b981'
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-500" /> Kategori Transaksi
        </CardTitle>
        <CardDescription>Kelola kategori pemasukan & pengeluaran Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group hover:bg-white/[0.08] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                  {cat.icon}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{cat.name}</div>
                  <div className="text-xs text-muted-foreground uppercase">{cat.type}</div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 h-8 w-8 p-0"
                onClick={() => handleDeleteCategory(cat.id)}
                disabled={loadingId === cat.id}
              >
                {loadingId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground italic">Belum ada kategori.</div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10 space-y-3">
          <h4 className="text-sm font-bold text-white">Tambah Kategori</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Nama Kategori"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-zinc-950/50 border-white/10 h-9 text-sm flex-1"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-md px-2 text-sm text-white w-28"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <Button 
            size="sm" 
            onClick={handleAddCategory}
            disabled={loadingId === 'new' || !newName}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-9"
          >
            {loadingId === 'new' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Tambah Kategori
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
