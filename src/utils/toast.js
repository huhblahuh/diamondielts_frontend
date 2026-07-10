import Swal from 'sweetalert2';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

export const showToastError = (message) => {
    Toast.fire({
        icon: 'error',
        title: message || 'Đã xảy ra lỗi hệ thống'
    });
};

export const showToastSuccess = (message) => {
    Toast.fire({
        icon: 'success',
        title: message || 'Thành công'
    });
};

export const showToastWarning = (message) => {
    Toast.fire({
        icon: 'warning',
        title: message
    });
};

export const showToastInfo = (message) => {
    Toast.fire({
        icon: 'info',
        title: message
    });
};
