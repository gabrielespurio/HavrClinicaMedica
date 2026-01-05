import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { usePatients, useUpdatePatient, type Patient } from "@/hooks/usePatients";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PatientForm } from "@/components/patients/PatientForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PatientHistory } from "@/components/patients/PatientHistory";

export default function Patients() {
  const { data: patients, isLoading } = usePatients();
  const updatePatient = useUpdatePatient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const filteredPatients = (patients || []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.cpf.includes(search)
  );

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPatient(null);
    setIsDialogOpen(true);
  };

  const toggleStatus = async (patient: Patient) => {
    await updatePatient.mutateAsync({
      id: patient.id,
      data: {
        status: patient.status === "active" ? "inactive" : "active",
      },
    });
  };

  return (
    <Shell>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Pacientes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os pacientes, planos e status.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} className="gap-2 shadow-sm" data-testid="button-new-patient">
                <Plus className="h-4 w-4" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPatient ? "Dados do Paciente" : "Novo Paciente"}
                </DialogTitle>
                <DialogDescription>
                  {editingPatient 
                    ? "Visualize os dados e histórico ou edite as informações." 
                    : "Preencha os dados do paciente. O endereço será preenchido automaticamente pelo CEP."}
                </DialogDescription>
              </DialogHeader>

              {editingPatient ? (
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="details" data-testid="tab-patient-details">Dados Cadastrais</TabsTrigger>
                    <TabsTrigger value="history" data-testid="tab-patient-history">Histórico de Atendimentos</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details">
                    <PatientForm
                      patient={editingPatient}
                      onSuccess={() => setIsDialogOpen(false)}
                    />
                  </TabsContent>
                  <TabsContent value="history">
                    <PatientHistory patientId={editingPatient.id} />
                  </TabsContent>
                </Tabs>
              ) : (
                <PatientForm
                  patient={null}
                  onSuccess={() => setIsDialogOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-4 bg-card p-4 rounded-lg border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              className="pl-9 border-none bg-muted/50 focus-visible:ring-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-patients"
            />
          </div>
        </div>

        <div className="rounded-md border bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Plano (Fim)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum paciente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className="group hover:bg-muted/30 transition-colors" data-testid={`row-patient-${patient.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{patient.name}</span>
                          <span className="text-xs text-muted-foreground">{patient.email || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{patient.cpf}</TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>
                        {patient.planEndDate 
                          ? format(parseISO(patient.planEndDate), "dd/MM/yyyy", { locale: ptBR })
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={patient.status === "active" ? "default" : "destructive"}
                          className={
                            patient.status === "active"
                              ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200"
                              : "bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-200"
                          }
                        >
                          {patient.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-actions-${patient.id}`}>
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(patient)} data-testid={`button-edit-${patient.id}`}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(patient)} data-testid={`button-toggle-${patient.id}`}>
                              {patient.status === "active" ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Shell>
  );
}
