import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUser, useUpdateUser, type UserWithoutPassword } from "@/hooks/useUsers";
import { Loader2 } from "lucide-react";

const userFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  username: z.string().min(3, "Login deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  role: z.enum(["admin", "secretaria"], { required_error: "Selecione um cargo" }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user: UserWithoutPassword | null;
  onSuccess: () => void;
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      username: user?.username || "",
      password: "",
      role: (user?.role as "admin" | "secretaria") || "secretaria",
    },
  });

  const isEditing = !!user;
  const isPending = createUser.isPending || updateUser.isPending;

  const onSubmit = async (values: UserFormValues) => {
    try {
      if (isEditing) {
        const updateData: any = { ...values };
        if (!values.password) {
          delete updateData.password;
        }
        if (!values.email) {
          updateData.email = null;
        }
        await updateUser.mutateAsync({ id: user.id, data: updateData });
      } else {
        if (!values.password) {
          form.setError("password", { message: "Senha é obrigatória para novos usuários" });
          return;
        }
        await createUser.mutateAsync({
          ...values,
          email: values.email || null,
          phone: values.phone || null,
          password: values.password,
        });
      }
      onSuccess();
    } catch (error: any) {
      if (error?.message) {
        form.setError("root", { message: error.message });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo" {...field} data-testid="input-user-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@exemplo.com" type="email" {...field} data-testid="input-user-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input placeholder="(11) 99999-9999" {...field} data-testid="input-user-phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Login</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Login de acesso" 
                  {...field} 
                  disabled={isEditing}
                  data-testid="input-user-username" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEditing ? "Nova Senha (deixe em branco para manter)" : "Senha"}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={isEditing ? "Nova senha" : "Senha"} 
                  type="password" 
                  {...field} 
                  data-testid="input-user-password" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-user-role">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin" data-testid="option-admin">Administrador</SelectItem>
                  <SelectItem value="secretaria" data-testid="option-secretaria">Secretaria</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-submit-user">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar" : "Criar Usuário"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
