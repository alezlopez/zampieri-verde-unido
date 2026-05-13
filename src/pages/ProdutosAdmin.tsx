import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Package, Layers } from "lucide-react";
import { EventosHeader } from "@/components/EventosHeader";
import { Footer } from "@/components/Footer";

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ativo: boolean;
  estoque_controlado: boolean;
  estoque_total: number | null;
  is_global: boolean;
}
interface Variacao {
  id: string;
  produto_id: string;
  nome: string;
  preco: number;
  preco_parcelado: number;
  max_parcelas: number;
  estoque_total: number | null;
  ativo: boolean;
  ordem: number;
}

const emptyProduto = (): Partial<Produto> => ({
  nome: "", descricao: "", imagem_url: "", ativo: true,
  estoque_controlado: false, estoque_total: null, is_global: false,
});
const emptyVariacao = (produto_id: string): Partial<Variacao> => ({
  produto_id, nome: "", preco: 0, preco_parcelado: 0, max_parcelas: 1,
  estoque_total: null, ativo: true, ordem: 0,
});

const ProdutosAdmin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variacoes, setVariacoes] = useState<Record<string, Variacao[]>>({});
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Partial<Produto> | null>(null);
  const [editingVar, setEditingVar] = useState<Partial<Variacao> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/eventos/login");
  }, [user, isAdmin, authLoading, navigate]);

  const loadAll = async () => {
    setLoading(true);
    const { data: prods } = await supabase.from("produtos").select("*").order("created_at", { ascending: false });
    setProdutos((prods || []) as Produto[]);
    if (prods && prods.length > 0) {
      const { data: vars } = await supabase
        .from("produto_variacoes")
        .select("*")
        .in("produto_id", prods.map((p: any) => p.id))
        .order("ordem");
      const map: Record<string, Variacao[]> = {};
      for (const v of (vars || []) as Variacao[]) {
        if (!map[v.produto_id]) map[v.produto_id] = [];
        map[v.produto_id].push(v);
      }
      setVariacoes(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const saveProduto = async () => {
    if (!editing?.nome?.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    const payload = {
      nome: editing.nome.trim(),
      descricao: editing.descricao || null,
      imagem_url: editing.imagem_url || null,
      ativo: editing.ativo ?? true,
      estoque_controlado: editing.estoque_controlado ?? false,
      estoque_total: editing.estoque_controlado ? (editing.estoque_total ?? null) : null,
      is_global: editing.is_global ?? false,
    };
    const { error } = editing.id
      ? await supabase.from("produtos").update(payload).eq("id", editing.id)
      : await supabase.from("produtos").insert(payload);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Salvo!" });
    setEditing(null);
    loadAll();
  };

  const removeProduto = async (id: string) => {
    if (!confirm("Excluir produto e todas as variações?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    loadAll();
  };

  const saveVariacao = async () => {
    if (!editingVar?.nome?.trim() || !editingVar.produto_id) return;
    const payload = {
      produto_id: editingVar.produto_id,
      nome: editingVar.nome.trim(),
      preco: Number(editingVar.preco) || 0,
      preco_parcelado: Number(editingVar.preco_parcelado) || Number(editingVar.preco) || 0,
      max_parcelas: Number(editingVar.max_parcelas) || 1,
      estoque_total: editingVar.estoque_total ?? null,
      ativo: editingVar.ativo ?? true,
      ordem: Number(editingVar.ordem) || 0,
    };
    const { error } = editingVar.id
      ? await supabase.from("produto_variacoes").update(payload).eq("id", editingVar.id)
      : await supabase.from("produto_variacoes").insert(payload);
    if (error) { toast({ title: "Erro ao salvar variação", description: error.message, variant: "destructive" }); return; }
    setEditingVar(null);
    loadAll();
  };

  const removeVariacao = async (id: string) => {
    if (!confirm("Excluir variação?")) return;
    const { error } = await supabase.from("produto_variacoes").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    loadAll();
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zampieri-green" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EventosHeader subtitle="Produtos & Cartelas" />
      <div className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <Link to="/eventos/admin" className="inline-flex items-center text-zampieri-green-dark hover:text-zampieri-gold mb-6 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />Painel Admin
          </Link>

          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-zampieri-green-dark flex items-center gap-2">
              <Package className="w-6 h-6" /> Produtos
            </h1>
            <div className="flex gap-2">
              <Link to="/eventos/admin/produtos/relatorio">
                <Button variant="outline" className="border-zampieri-green-dark text-zampieri-green-dark hover:bg-zampieri-cream">
                  Relatório
                </Button>
              </Link>
              <Button onClick={() => setEditing(emptyProduto())} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">
                <Plus className="w-4 h-4 mr-2" />Novo produto
              </Button>
            </div>
          </div>

          {editing && (
            <Card className="mb-6 border-zampieri-gold/40">
              <CardHeader><CardTitle>{editing.id ? "Editar produto" : "Novo produto"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Nome</Label><Input value={editing.nome || ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={editing.descricao || ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} /></div>
                <div><Label>URL da imagem</Label><Input value={editing.imagem_url || ""} onChange={(e) => setEditing({ ...editing, imagem_url: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Checkbox checked={!!editing.ativo} onCheckedChange={(c) => setEditing({ ...editing, ativo: !!c })} /><Label>Ativo</Label></div>
                <div className="flex items-center gap-2"><Checkbox checked={!!editing.is_global} onCheckedChange={(c) => setEditing({ ...editing, is_global: !!c })} /><Label>Aparecer em catálogo global (/produtos)</Label></div>
                <div className="flex items-center gap-2"><Checkbox checked={!!editing.estoque_controlado} onCheckedChange={(c) => setEditing({ ...editing, estoque_controlado: !!c })} /><Label>Estoque controlado</Label></div>
                {editing.estoque_controlado && (
                  <div><Label>Estoque total (do produto)</Label><Input type="number" value={editing.estoque_total ?? ""} onChange={(e) => setEditing({ ...editing, estoque_total: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveProduto} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">Salvar</Button>
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {editingVar && (
            <Card className="mb-6 border-zampieri-gold/40">
              <CardHeader><CardTitle>{editingVar.id ? "Editar variação" : "Nova variação"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Nome (ex.: "Cartela simples")</Label><Input value={editingVar.nome || ""} onChange={(e) => setEditingVar({ ...editingVar, nome: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Preço à vista</Label><Input type="number" step="0.01" value={editingVar.preco ?? 0} onChange={(e) => setEditingVar({ ...editingVar, preco: Number(e.target.value) })} /></div>
                  <div><Label>Preço parcelado</Label><Input type="number" step="0.01" value={editingVar.preco_parcelado ?? 0} onChange={(e) => setEditingVar({ ...editingVar, preco_parcelado: Number(e.target.value) })} /></div>
                  <div><Label>Máx parcelas</Label><Input type="number" value={editingVar.max_parcelas ?? 1} onChange={(e) => setEditingVar({ ...editingVar, max_parcelas: Number(e.target.value) })} /></div>
                  <div><Label>Estoque (deixe vazio p/ ilimitado)</Label><Input type="number" value={editingVar.estoque_total ?? ""} onChange={(e) => setEditingVar({ ...editingVar, estoque_total: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                  <div><Label>Ordem</Label><Input type="number" value={editingVar.ordem ?? 0} onChange={(e) => setEditingVar({ ...editingVar, ordem: Number(e.target.value) })} /></div>
                </div>
                <div className="flex items-center gap-2"><Checkbox checked={!!editingVar.ativo} onCheckedChange={(c) => setEditingVar({ ...editingVar, ativo: !!c })} /><Label>Ativa</Label></div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveVariacao} className="bg-zampieri-green-dark hover:bg-zampieri-green text-white">Salvar</Button>
                  <Button variant="outline" onClick={() => setEditingVar(null)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {produtos.map((p) => (
              <Card key={p.id} className={p.ativo ? "" : "opacity-60"}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-zampieri-green-dark">{p.nome}</h3>
                      {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {!p.ativo && <Badge variant="outline">Inativo</Badge>}
                        {p.is_global && <Badge className="bg-zampieri-gold/20 text-zampieri-green-dark">Catálogo global</Badge>}
                        {p.estoque_controlado && <Badge variant="outline">Estoque: {p.estoque_total ?? "—"}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => removeProduto(p.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Variações</span>
                      <Button size="sm" variant="ghost" onClick={() => setEditingVar(emptyVariacao(p.id))}><Plus className="w-3 h-3 mr-1" />Variação</Button>
                    </div>
                    {(variacoes[p.id] || []).length === 0 && <p className="text-sm text-muted-foreground italic">Nenhuma variação cadastrada</p>}
                    {(variacoes[p.id] || []).map((v) => (
                      <div key={v.id} className="flex items-center justify-between border-b last:border-b-0 py-2">
                        <div>
                          <span className="font-medium">{v.nome}</span>
                          <span className="text-sm text-muted-foreground ml-2">R$ {Number(v.preco).toFixed(2)} {v.preco_parcelado > 0 && `· parc. R$ ${Number(v.preco_parcelado).toFixed(2)} em até ${v.max_parcelas}x`}</span>
                          {v.estoque_total !== null && <Badge variant="outline" className="ml-2">est: {v.estoque_total}</Badge>}
                          {!v.ativo && <Badge variant="outline" className="ml-2">inativa</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingVar(v)}><Pencil className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => removeVariacao(v.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {produtos.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado.</p>}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProdutosAdmin;
