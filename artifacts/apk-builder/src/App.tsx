import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";
import { ThemeProvider } from "@/lib/theme";

import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewProject from "@/pages/new-project";
import ProjectDetail from "@/pages/project-detail";
import Builds from "@/pages/builds";
import Keystore from "@/pages/keystore";
import Settings from "@/pages/settings";
import Chat from "@/pages/chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/new" component={NewProject} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/builds" component={Builds} />
        <Route path="/keystore" component={Keystore} />
        <Route path="/settings" component={Settings} />
        <Route path="/chat" component={Chat} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
