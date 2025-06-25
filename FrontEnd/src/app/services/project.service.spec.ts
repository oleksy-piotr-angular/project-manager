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
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });
    service = TestBed.inject(ProjectService);
    service.clearProjects(); // Ensure a clean state for signals before each test
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.projects()).toEqual([]);
    expect(service.filterText()).toBe('');
    expect(service.statusFilter()).toBe('all');
  });

  // Test loadProjects
  it('should load projects and update the projects signal', (done) => {
    apiServiceSpy.get.and.returnValue(of([mockProjectDto1, mockProjectDto2]));
    const userId = 'u1';

    service.loadProjects(userId).subscribe((projects) => {
      expect(projects).toEqual([mockProject1, mockProject2]);
      expect(service.projects()).toEqual([mockProject1, mockProject2]);
      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        `projects?userId=${userId}`
      );
      done();
    });
  });

  it('should clear projects on loadProjects error', (done) => {
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('API Error')));
    const userId = 'u1';
    spyOn(console, 'error'); // Spy on console.error to prevent test output clutter

    service.loadProjects(userId).subscribe((projects) => {
      expect(projects).toEqual([]);
      expect(service.projects()).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load projects:',
        jasmine.any(Error)
      );
      done();
    });
  });

  // Test getProjectById
  it('should retrieve a single project by ID', (done) => {
    apiServiceSpy.get.and.returnValue(of(mockProjectDto1));
    const projectId = 'p1';

    service.getProjectById(projectId).subscribe((project) => {
      expect(project).toEqual(mockProject1);
      expect(apiServiceSpy.get).toHaveBeenCalledWith(`projects/${projectId}`);
      done();
    });
  });

  it('should return undefined on getProjectById error', (done) => {
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('Not found')));
    const projectId = 'p_nonexistent';
    spyOn(console, 'error');

    service.getProjectById(projectId).subscribe((project) => {
      expect(project).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        `Failed to get project with ID ${projectId}:`,
        jasmine.any(Error)
      );
      done();
    });
  });

  // Test createProject
  it('should create a project and add it to the projects signal', (done) => {
    const createDto: CreateProjectDto = {
      userId: 'u1',
      name: 'New Proj',
      description: 'New Desc',
      status: 'active',
    };
    const responseDto = { id: 'p3', ...createDto };
    const newProject: Project = ProjectMapper.fromDto(responseDto);

    apiServiceSpy.post.and.returnValue(of(responseDto));

    service.createProject(createDto).subscribe((project) => {
      expect(project).toEqual(newProject);
      expect(service.projects()).toEqual([newProject]); // Initial state was empty
      expect(apiServiceSpy.post).toHaveBeenCalledWith('projects', createDto);
      done();
    });
  });

  // Test updateProject
  it('should update a project and modify it in the projects signal', (done) => {
    // Seed initial state
    service['_projects'].set([mockProject1, mockProject2]);

    const updateDto: UpdateProjectDto = {
      name: 'Updated Proj 1 Name',
      status: 'on_hold',
    };
    const responseDto = { ...mockProjectDto1, ...updateDto }; // Simulate server response merge
    const updatedProject: Project = ProjectMapper.fromDto(responseDto);

    apiServiceSpy.patch.and.returnValue(of(responseDto)); // Use patch

    service.updateProject(mockProject1.id, updateDto).subscribe((project) => {
      expect(project).toEqual(updatedProject);
      expect(service.projects()).toEqual([updatedProject, mockProject2]); // Check order and update
      expect(apiServiceSpy.patch).toHaveBeenCalledWith(
        `projects/${mockProject1.id}`,
        updateDto
      );
      done();
    });
  });

  // Test deleteProject
  it('should delete a project and remove it from the projects signal', (done) => {
    // Seed initial state
    service['_projects'].set([mockProject1, mockProject2]);

    apiServiceSpy.delete.and.returnValue(of(null)); // Simulate successful delete with null/empty response

    service.deleteProject(mockProject1.id).subscribe(() => {
      expect(service.projects()).toEqual([mockProject2]); // Only project2 should remain
      expect(apiServiceSpy.delete).toHaveBeenCalledWith(
        `projects/${mockProject1.id}`
      );
      done();
    });
  });

  // Test clearProjects
  it('should clear the projects signal', () => {
    service['_projects'].set([mockProject1]); // Set some initial data
    expect(service.projects().length).toBe(1);
    service.clearProjects();
    expect(service.projects()).toEqual([]);
  });

  // Test filteredProjects (filter by text)
  it('should filter projects by text', () => {
    service['_projects'].set([
      mockProject1,
      mockProject2,
      { ...mockProject1, id: 'p3', name: 'Another Proj 1' },
    ]);
    service.filterText.set('proj 1'); // Case-insensitive filter

    expect(service.filteredProjects().length).toBe(2);
    expect(service.filteredProjects()).toEqual([
      mockProject1,
      { ...mockProject1, id: 'p3', name: 'Another Proj 1' },
    ]);
  });

  // Test filteredProjects (filter by status)
  it('should filter projects by status', () => {
    service['_projects'].set([mockProject1, mockProject2]); // p1: active, p2: completed
    service.statusFilter.set('active');

    expect(service.filteredProjects().length).toBe(1);
    expect(service.filteredProjects()).toEqual([mockProject1]);
  });

  // Test filteredProjects (combined filters)
  it('should filter projects by text and status combined', () => {
    service['_projects'].set([
      mockProject1, // Proj 1, active
      mockProject2, // Proj 2, completed
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

    service.filterText.set('another');
    service.statusFilter.set('active');

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
