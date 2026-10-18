// src/features/courses/CourseList.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseService } from '../../services/course.service';
import type { Course } from '../../types';

export const CourseList = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await courseService.getAllCourses();
        setCourses(data);
      } catch (err) {
        setError('Không thể tải danh sách khóa học. Vui lòng thử lại sau.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500 font-medium">Đang tải danh sách khóa học...</div>;
  if (error) return <div className="p-10 text-center text-red-500 font-medium">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Danh sách Khóa học</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <img src={course.thumbnail} alt={course.title} className="w-full h-48 object-cover" />
            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h2>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm font-medium text-gray-500">{course.lessonsCount} bài giảng</span>
                <Link 
                  to={`/courses/${course.id}/lessons/default`}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Vào học
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};