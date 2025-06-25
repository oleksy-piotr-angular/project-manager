import { TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { ApiService } from './api.service';
import { Project } from '../models/project.model';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { ProjectMapper } from '../mappers/project.mapper';
import { of, throwError } from 'rxjs';

describe('ProjectService', () => {
  let service: ProjectService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockProjectDto1 = {
    id: 'p1',
    userId: 'u1',
    name: 'Proj 1',
    description: 'Desc 1',
    status: 'active',
  };
  const mockProjectDto2 = {
    id: 'p2',
    userId: 'u1',
    name: 'Proj 2',
    description: 'Desc 2',
    status: 'completed',
  };
  const mockProject1: Project = ProjectMapper.fromDto(mockProjectDto1);
  const mockProject2: Project = ProjectMapper.fromDto(mockProjectDto2);

  beforeEach(() => {
    // Create a spy object for ApiService
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: ApiService, useValue: apiServiceSpy }, // Provide the spy as the ApiService
      ],
    });
    service = TestBed.inject(ProjectService);
    service.clearProjects(); // Ensure projects signal is clear before each test
  });

  // Test that the service is created and initial state is correct.
  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.projects()).toEqual([]);
    expect(service.filterText()).toBe('');
    expect(service.statusFilter()).toBe('all');
  });

  // Test loading projects successfully and updating the projects signal.
  it('should load projects and update the projects signal', (done) => {
    // Mock ApiService.get to return a list of project DTOs
    apiServiceSpy.get.and.returnValue(of([mockProjectDto1, mockProjectDto2]));
    const userId = 'u1';

    service.loadProjects(userId).subscribe((projects: Project[]) => {
      // Project used for type annotation
      // Verify returned projects and the signal's value
      expect(projects).toEqual([mockProject1, mockProject2]);
      expect(service.projects()).toEqual([mockProject1, mockProject2]);
      // Verify ApiService.get was called with correct path
      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        `projects?userId=${userId}`
      );
      done();
    });
  });

  // Test error handling when loading projects fails.
  it('should clear projects on loadProjects error', (done) => {
    // Mock ApiService.get to throw an error
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('API Error')));
    const userId = 'u1';
    spyOn(console, 'error'); // Spy on console.error to check logging

    service.loadProjects(userId).subscribe((projects: Project[]) => {
      // Project used for type annotation
      // Verify that projects signal is cleared and error is logged
      expect(projects).toEqual([]);
      expect(service.projects()).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load projects:',
        jasmine.any(Error)
      );
      done();
    });
  });

  // Test retrieving a single project by ID successfully.
  it('should retrieve a single project by ID', (done) => {
    // Mock ApiService.get to return a single project DTO
    apiServiceSpy.get.and.returnValue(of(mockProjectDto1));
    const projectId = 'p1';

    service
      .getProjectById(projectId)
      .subscribe((project: Project | undefined) => {
        // Project used for type annotation
        // Verify the returned project
        expect(project).toEqual(mockProject1);
        // Verify ApiService.get was called with correct path
        expect(apiServiceSpy.get).toHaveBeenCalledWith(`projects/${projectId}`);
        done();
      });
  });

  // Test returning undefined when a project is not found or API call fails.
  it('should return undefined on getProjectById error', (done) => {
    // Mock ApiService.get to throw an error (simulating not found)
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('Not found')));
    const projectId = 'p_nonexistent';
    spyOn(console, 'error'); // Spy on console.error

    service
      .getProjectById(projectId)
      .subscribe((project: Project | undefined) => {
        // Project used for type annotation
        // Verify undefined is returned and error is logged
        expect(project).toBeUndefined();
        expect(console.error).toHaveBeenCalledWith(
          `Failed to get project with ID ${projectId}:`,
          jasmine.any(Error)
        );
        done();
      });
  });

  // Test creating a new project successfully.
  it('should create a project and add it to the projects signal', (done) => {
    const createDto: CreateProjectDto = {
      // CreateProjectDto used for type annotation
      userId: 'u1',
      name: 'New Proj',
      description: 'New Desc',
      status: 'active',
    };
    const responseDto = { id: 'p3', ...createDto };
    const newProject: Project = ProjectMapper.fromDto(responseDto); // Project used for type annotation

    // Mock ApiService.post to return the new project DTO
    apiServiceSpy.post.and.returnValue(of(responseDto));

    service.createProject(createDto).subscribe((project: Project) => {
      // Project used for type annotation
      // Verify the returned project and that it's added to the signal
      expect(project).toEqual(newProject);
      expect(service.projects()).toEqual([newProject]);
      // Verify ApiService.post was called with correct data
      expect(apiServiceSpy.post).toHaveBeenCalledWith('projects', createDto);
      done();
    });
  });

  // Test updating an existing project successfully.
  it('should update a project and modify it in the projects signal', (done) => {
    // Initialize projects signal with existing projects
    service['_projects'].set([mockProject1, mockProject2]);

    const updateDto: UpdateProjectDto = {
      // UpdateProjectDto used for type annotation
      name: 'Updated Proj 1 Name',
      status: 'on_hold',
    };
    const responseDto = { ...mockProjectDto1, ...updateDto };
    const updatedProject: Project = ProjectMapper.fromDto(responseDto); // Project used for type annotation

    // Mock ApiService.patch to return the updated project DTO
    apiServiceSpy.patch.and.returnValue(of(responseDto));

    service
      .updateProject(mockProject1.id, updateDto)
      .subscribe((project: Project) => {
        // Project used for type annotation
        // Verify the returned project and that the signal reflects the update
        expect(project).toEqual(updatedProject);
        expect(service.projects()).toEqual([updatedProject, mockProject2]);
        // Verify ApiService.patch was called with correct ID and data
        expect(apiServiceSpy.patch).toHaveBeenCalledWith(
          `projects/${mockProject1.id}`,
          updateDto
        );
        done();
      });
  });

  // Test deleting a project successfully.
  it('should delete a project and remove it from the projects signal', (done) => {
    // Initialize projects signal with existing projects
    service['_projects'].set([mockProject1, mockProject2]);

    // Mock ApiService.delete to return null (success)
    apiServiceSpy.delete.and.returnValue(of(null));

    service.deleteProject(mockProject1.id).subscribe(() => {
      // Verify the project is removed from the signal
      expect(service.projects()).toEqual([mockProject2]);
      // Verify ApiService.delete was called with correct ID
      expect(apiServiceSpy.delete).toHaveBeenCalledWith(
        `projects/${mockProject1.id}`
      );
      done();
    });
  });

  // Test clearing all projects from the signal.
  it('should clear the projects signal', () => {
    service['_projects'].set([mockProject1]); // Set some projects
    expect(service.projects().length).toBe(1);
    service.clearProjects(); // Call clear method
    expect(service.projects()).toEqual([]); // Verify it's empty
  });

  // Test filtering projects by text in name or description.
  it('should filter projects by text', () => {
    service['_projects'].set([
      mockProject1,
      mockProject2,
      { ...mockProject1, id: 'p3', name: 'Another Proj 1' },
    ]);
    service.filterText.set('proj 1'); // Set filter text

    // Verify filtered projects match the criteria
    expect(service.filteredProjects().length).toBe(2);
    expect(service.filteredProjects()).toEqual([
      mockProject1,
      { ...mockProject1, id: 'p3', name: 'Another Proj 1' },
    ]);
  });

  // Test filtering projects by status.
  it('should filter projects by status', () => {
    service['_projects'].set([mockProject1, mockProject2]);
    service.statusFilter.set('active'); // Set status filter

    // Verify filtered projects match the criteria
    expect(service.filteredProjects().length).toBe(1);
    expect(service.filteredProjects()).toEqual([mockProject1]);
  });

  // Test filtering projects by both text and status combined.
  it('should filter projects by text and status combined', () => {
    service['_projects'].set([
      mockProject1,
      mockProject2,
      {
        ...mockProject1,
        id: 'p3',
        name: 'Another active Proj',
        status: 'active',
      },
      {
        ...mockProject2,
        id: 'p4',
        name: 'Another completed Proj',
        status: 'completed',
      },
    ]);

    service.filterText.set('another'); // Set text filter
    service.statusFilter.set('active'); // Set status filter

    // Verify filtered projects match both criteria
    expect(service.filteredProjects().length).toBe(1);
    expect(service.filteredProjects()).toEqual([
      {
        ...mockProject1,
        id: 'p3',
        name: 'Another active Proj',
        status: 'active',
      },
    ]);
  });
});
