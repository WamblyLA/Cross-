import { View } from "react-native";
import { SectionTitle } from "../common/SectionTitle";
import { ProjectCard } from "./ProjectCard";
import type { CloudProject } from "../../types/projects";

type ProjectSectionProps = {
  title: string;
  subtitle: string;
  projects: CloudProject[];
  onOpenProject: (project: CloudProject) => void;
};

export function ProjectSection({
  title,
  subtitle,
  projects,
  onOpenProject,
}: ProjectSectionProps) {
  return (
    <View className="gap-3">
      <SectionTitle subtitle={subtitle} title={title} />
      <View className="gap-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            onPress={() => onOpenProject(project)}
            project={project}
          />
        ))}
      </View>
    </View>
  );
}
